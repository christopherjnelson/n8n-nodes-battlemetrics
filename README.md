# n8n-nodes-battlemetrics

An early-development, unofficial n8n community node for the BattleMetrics API. This project is not
affiliated with, endorsed by, or sponsored by BattleMetrics.

[BattleMetrics](https://www.battlemetrics.com/) provides game-server monitoring, player history, and
server administration services. This package is intentionally conservative because player and
moderation records can contain sensitive data.

## Current scope

The current package implements exactly four read-only operations:

- **Server → Get**: `GET https://api.battlemetrics.com/servers/{serverId}`
- **Server → Get Many**: `GET https://api.battlemetrics.com/servers`
- **Game → Get Many**: `GET https://api.battlemetrics.com/games`
- **Player → Get**: `GET https://api.battlemetrics.com/players/{playerId}`

It also includes typed transport, input validation, JSON:API validation and preservation, bounded
same-origin pagination, safe error normalization, an opt-in read-only live verifier, and mocked tests.
Get Many uses each API collection's default ordering and exposes only **Return All** and a local
**Limit**. Search, filters, sorting, includes, sparse fields, page-size, offset, and cursor controls
remain deferred because their current first-party contracts could not be retrieved. Player collection
access/search is specifically deferred: its required constraint, permitted search fields, privacy
boundary, and pagination contract are unresolved, so the node never enumerates players. There is no Game
Get-by-ID, trigger node, websocket support, arbitrary request operation, moderation
write, or user-configurable API host.

The broader read list—Player Get Many/Search, Organization Get/Get Many, Ban List Get/Get
Many, and Ban Get/Get Many—is a proposed roadmap, not a `0.1.0` promise. Every resource remains deferred
until its current official method, parameters, permissions, and response contract can be re-verified.
Ban create, update, and delete are not recommended for `0.1.0`.

See [the API inventory](docs/research/api-inventory.md) and [the API scope ADR](docs/adr/0002-api-scope.md).

## Local development

Requirements used for the current release-hardening pass:

- Node.js 24.18.0
- pnpm 11.15.0
- n8n 2.30.6 for the isolated packed-package editor test

```sh
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm test
pnpm run build
pnpm pack --dry-run
pnpm run test:package
```

`pnpm run dev` starts the development environment provided by the official n8n node CLI. Compatibility
outside the versions recorded above has not been established. The package declares Node.js 22 or newer
because the current official scaffold supports modern maintained Node releases; CI checks Node 22 and 24.

## Authentication

All operations require the **BattleMetrics API** credential. Store a BattleMetrics personal access
token in its **Access Token** field. A personal access token may not be sufficient by itself: REST API
access may also require an eligible BattleMetrics subscription. The credential adds
`Authorization: Bearer …` through n8n's credential system. The token is never a node parameter, output
field, log field, fixture, or error detail.

The shared transport reads the credential and attaches the Bearer header itself. The credential does
not opt into n8n proxy authentication because n8n 2.30.6 otherwise injects an unrestricted Custom API
Call into community nodes; that would exceed this package's verified operation scope.

To create a token, sign in to BattleMetrics, open the official
[developer area](https://www.battlemetrics.com/developers), select **Personal Access Tokens**, create a
token, and save it immediately in n8n credentials. Choose only the permissions needed by your intended
operations and protect the token like a password. The official documentation page was protected from
automated access during the 2026-08-02 research pass, so labels and available permissions must be
checked in the live developer UI before use.

The credential intentionally has no network test button. n8n cannot reliably prevalidate all token,
subscription, scope, and resource-permission states, so the required secret is validated when an
operation runs. Current safe observation distinguishes an invalid Bearer token (`401`) from the
subscription-required response (`403`). On 2026-08-04, a subscribed owner token successfully completed
Server Get, Server Get Many, Game Get Many, and owner-approved Player Get with `200` responses. A subscription response is never presented as
successful credential validation.

No optional personal-access-token permissions were selected or required for the subscribed Server,
Game, and Player checks. This is a direct observation for the tested token, not a universal scope or plan claim; other resources,
organization roles, and future operations require separate verification.

### Permission status

| Operation group          | Token required by this node | Exact BattleMetrics permission/scope                               |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| Server Get/Get Many      | Yes                         | No optional token permission required in the subscribed test       |
| Game Get Many            | Yes                         | No optional token permission required in the subscribed test       |
| Player Get               | Yes                         | No optional token permission required in the subscribed test       |
| Proposed read operations | Yes                         | Unresolved per endpoint; must be verified before implementation    |
| Moderation writes        | Not implemented             | Unresolved; organization role/resource permission is also expected |

An anonymous request made during research returned `403` with “A subscription is required to use the
API.” Authentication does not override BattleMetrics account, subscription, organization, or resource
permissions.

## Output, pagination, and errors

Server Get and Player Get each return one n8n item containing the complete JSON:API envelope. `data`, `attributes`,
`relationships`, `included`, `links`, and `meta` are not flattened away. The item is linked to its source
with `pairedItem`.

Game Get Many preserves a single-page envelope, trimming only `data` when needed. For multiple pages,
both collection operations return one combined envelope per source item. Primary `data` resources are merged in
API order and trimmed to the local Limit. `included` resources are preserved in first-seen order and
deduplicated by the exact string pair `type` + `id`; relationships remain untouched. Original page
`links`, `meta`, and `jsonapi` context is preserved under `meta.n8n.sourcePageContext`. Original links are
not copied to the combined top level, so they are not misrepresented as links for the local combined
result.

Pagination follows `links.next`, accepts relative links and absolute HTTPS links on
`api.battlemetrics.com`, requires the selected `/servers` or `/games` path, rejects other protocols/origins and URL user
information, preserves page order, detects repeated links, and enforces 100-page and
10,000-primary-item caps. It performs no sleep or retry loop. `429` is surfaced with a validated
`Retry-After` value when one is present.

Errors preserve concise JSON:API status/title/detail information plus operation and input-item context.
Bearer tokens, authorization/cookie values, and oversized text are redacted or truncated. With
**Continue On Fail**, processing continues and a paired concise error item is returned. Observable
categories include invalid credential, subscription required, permission denied, resource not found, rate
limited, server error, timeout, network error, and malformed response. Automatic retry is deliberately
deferred.

The subscribed `200`, invalid-token `401`, and missing-server `404` responses observed on 2026-08-04
did not expose REST quota, remaining, reset, or `Retry-After` headers. They did expose `api-version`,
private cache control, and a cache-bypass status. The documented outbound-webhook limits are a different
system and are not used as REST limits here.

The two observed Game pages each contained 10 `game` resources. They had attributes `maxPlayers24H`,
`maxPlayers30D`, `maxPlayers7D`, `metadata`, `minPlayers24H`, `minPlayers30D`, `minPlayers7D`, `name`,
`players`, `playersByCountry`, `servers`, and `serversByCountry`; relationships, `included`, `meta`, and
`jsonapi` were absent. Game responses used public cache control and `api-version: 0.1.0`.

The observed Player Get contained one exact-string `player` resource with attributes `createdAt`, `id`,
`name`, `positiveMatch`, `private`, and `updatedAt`; it had no relationships, an empty `included` array,
and no top-level `links`, `meta`, or `jsonapi`. The success response was `200 application/json`. A
synthetic missing Player ID returned `404 application/json`. Attribute meanings and nullability remain
unresolved; key presence is not a promise that every profile contains every key.

## Example workflows

Sanitized importable workflows are in [`examples/`](examples/README.md):

- [`get-server.json`](examples/get-server.json) uses Manual Trigger and Server → Get with a synthetic
  placeholder ID.
- [`get-player.json`](examples/get-player.json) uses Manual Trigger and Player → Get with the approved
  synthetic BattleMetrics Player ID.
- [`get-servers.json`](examples/get-servers.json) uses Manual Trigger and Server → Get Many with Return
  All disabled and Limit 10.
- [`get-games.json`](examples/get-games.json) uses Manual Trigger and Game → Get Many with Return All
  disabled and Limit 10.

The examples contain no credential ID, token, execution output, or real server or player data. After import,
create or select a BattleMetrics API credential and replace the synthetic Server ID where applicable.

## Opt-in live verification

Normal tests and CI never contact BattleMetrics. The local verifier requires a non-empty
`BATTLEMETRICS_ACCESS_TOKEN`; `BATTLEMETRICS_SERVER_ID` is optional and enables existing Server
single-resource checks, while `BATTLEMETRICS_PLAYER_ID` is optional and enables Player Get plus its
synthetic missing-player check. It performs read-only Server and Game collection requests, follows at most one
safe pagination link per collection, and makes one bounded
synthetic invalid-token check plus one bounded synthetic missing-server check. It never prints token or
server or player ID values, request headers, response bodies, resource values, or full URLs. Output is limited to
sanitized status, media type, structural key names, pagination target validity, safe numeric/rate/cache
headers, response timing, normalized failure categories, and pass/fail state. Normal tests exercise the
sanitizer entirely offline, and neither the verifier nor its output is published in the package.

For a repository-local `.env` that is ignored, untracked, and mode `600`, run:

```sh
node --env-file=.env scripts/live-verify.mjs
```

Do not redirect verifier output into a tracked file. A Premium subscribed run passed on 2026-08-04:
Server Get, Player Get, two Server Get Many pages, and two Game Get Many pages returned
`200 application/json`; the synthetic invalid token returned `401`, and synthetic missing Server and
Player IDs returned `404`. Only sanitized structure was retained; no live body, credential, configured
ID, player value, or private organization value was stored.

The exact Phase 1D tarball was also installed in a fresh localhost-only n8n 2.30.6 profile on Node.js
24.18.0. Editor metadata showed only Game and Server, with only Game Get Many for Game and no Custom API
Call. The checked-in example imported. Live Limit 5 returned exactly five games; Limit 11 followed one
safe next page, returned exactly 11 games, preserved exact string IDs, and produced a two-page combined
envelope without root pagination links. Sanitized inspection found no token, Authorization, or Bearer
text in execution output; the disposable database, output, profile, and tarball were removed afterward.

The exact Phase 1E tarball was installed in another fresh localhost-only n8n 2.30.6 profile. Protected
editor metadata exposed resources `game`, `player`, and `server`, with only Player Get under Player; the
required Player ID description distinguished BattleMetrics IDs from display names, Steam/platform IDs,
and Server IDs. The credential remained password-protected with no test button or generic proxy
authentication. The checked-in Player example imported. Player Get live execution and a two-input
success/missing-ID Continue On Fail workflow both passed through in-memory sanitizers; exact-string ID
matching, pairing, raw-envelope preservation, `resourceNotFound`/404, and absence of token or
Authorization text were confirmed. No raw response was written, and the profile and exact tarball were
deleted afterward.

## Privacy and AI-tool safety

BattleMetrics player identifiers, IP-derived data, notes, flags, activity, and ban reasons may be
personal, private, or moderation-sensitive. Minimize collection, restrict workflow access, choose the
least privilege token, and apply your retention and disclosure obligations.

Never include access tokens, private execution data, organization details, private player identifiers,
private moderation data, notes, ban reasons, flags, or unredacted API responses in issues. Use synthetic
examples.

The node sets `usableAsTool: true`. All current actions are read-only, use only Server, Game, or exact
BattleMetrics Player IDs, and use a fixed origin. If destructive operations are added later, workflows using AI agents must place
them behind explicit human approval and narrow credentials; ambiguous autonomous moderation is unsafe.

## Project guidance

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Community testing](docs/community-testing.md)
- [Release readiness](docs/release-readiness.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Changelog](CHANGELOG.md)

## License

MIT. Copyright © 2026 Christopher J. Nelson. See [LICENSE](LICENSE).
