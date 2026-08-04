# n8n-nodes-battlemetrics

An early-development, unofficial n8n community node for the BattleMetrics API. This project is not
affiliated with, endorsed by, or sponsored by BattleMetrics.

[BattleMetrics](https://www.battlemetrics.com/) provides game-server monitoring, player history, and
server administration services. This package is intentionally conservative because player and
moderation records can contain sensitive data.

## Current scope

Phase 1A implements two read-only operations:

- **Server → Get**: `GET https://api.battlemetrics.com/servers/{serverId}`
- **Server → Get Many**: `GET https://api.battlemetrics.com/servers`

It also includes typed transport, input validation, JSON:API validation and preservation, bounded
same-origin pagination, safe error normalization, an opt-in read-only live verifier, and mocked tests.
Get Many exposes only **Return All** and a local **Limit**. Search, game, country/region, status, sort,
include, and page-size parameters remain deferred because their current first-party contracts could not
be retrieved. There is no trigger node, websocket support, arbitrary request operation, moderation
write, or user-configurable API host.

The broader read list—Player Get/Get Many, Game Get Many, Organization Get/Get Many, Ban List Get/Get
Many, and Ban Get/Get Many—is a proposed roadmap, not a `0.1.0` promise. Every resource remains deferred
until its current official method, parameters, permissions, and response contract can be re-verified.
Ban create, update, and delete are not recommended for `0.1.0`.

See [the API inventory](docs/research/api-inventory.md) and [the API scope ADR](docs/adr/0002-api-scope.md).

## Local development

Requirements actually tested in this foundation pass:

- Node.js 24.18.0
- pnpm 11.15.0

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

To create a token, sign in to BattleMetrics, open the official
[developer area](https://www.battlemetrics.com/developers), select **Personal Access Tokens**, create a
token, and save it immediately in n8n credentials. Choose only the permissions needed by your intended
operations and protect the token like a password. The official documentation page was protected from
automated access during the 2026-08-02 research pass, so labels and available permissions must be
checked in the live developer UI before use.

The credential intentionally has no network test button. n8n cannot reliably prevalidate all token,
subscription, scope, and resource-permission states, so the required secret is validated when an
operation runs. Current safe observation distinguishes an invalid Bearer token (`401`) from the
subscription-required response (`403`), but no owner-provided valid token was available to complete the
matrix. A subscription response is never presented as successful credential validation.

### Permission status

| Operation group          | Token required by this node | Exact BattleMetrics permission/scope                               |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| Server Get/Get Many      | Yes                         | Unresolved in accessible official documentation                    |
| Proposed read operations | Yes                         | Unresolved per endpoint; must be verified before implementation    |
| Moderation writes        | Not implemented             | Unresolved; organization role/resource permission is also expected |

An anonymous request made during research returned `403` with “A subscription is required to use the
API.” Authentication does not override BattleMetrics account, subscription, organization, or resource
permissions.

## Output, pagination, and errors

Server Get returns one n8n item containing the complete JSON:API envelope. `data`, `attributes`,
`relationships`, `included`, `links`, and `meta` are not flattened away. The item is linked to its source
with `pairedItem`.

Server Get Many returns one combined envelope per source item. Primary `data` resources are merged in
API order and trimmed to the local Limit. `included` resources are preserved in first-seen order and
deduplicated by the exact string pair `type` + `id`; relationships remain untouched. Original page
`links`, `meta`, and `jsonapi` context is preserved under `meta.n8n.sourcePageContext`. Original links are
not copied to the combined top level, so they are not misrepresented as links for the local combined
result.

Pagination follows `links.next`, accepts relative links and absolute HTTPS links on
`api.battlemetrics.com`, requires the `/servers` path, rejects other protocols/origins and URL user
information, preserves page order, detects repeated links, and enforces 100-page and
10,000-primary-item caps. It performs no sleep or retry loop. `429` is surfaced with a validated
`Retry-After` value when one is present.

Errors preserve concise JSON:API status/title/detail information plus operation and input-item context.
Bearer tokens, authorization/cookie values, and oversized text are redacted or truncated. With
**Continue On Fail**, processing continues and a paired concise error item is returned. Observable
categories include invalid credential, subscription required, permission denied, not found, rate
limited, server error, timeout, network error, and malformed response. Automatic retry is deliberately
deferred.

BattleMetrics' current REST request quota and reset headers were not available in accessible official
documentation. The documented outbound-webhook limits are a different system and are not used as REST
limits here.

## Opt-in live verification

Normal tests and CI never contact BattleMetrics. The local verifier requires non-empty
`BATTLEMETRICS_ACCESS_TOKEN` and `BATTLEMETRICS_SERVER_ID` values. It performs read-only Server Get and
Server Get Many requests, follows at most one safe collection pagination link, and makes one bounded
synthetic invalid-token check plus one bounded synthetic missing-server check. It never prints token or
server-ID values, request headers, response bodies, resource values, or full URLs. Output is limited to
sanitized status, media type, structural key names, pagination target validity, safe numeric/rate/cache
headers, response timing, normalized failure categories, and pass/fail state. Normal tests exercise the
sanitizer entirely offline, and neither the verifier nor its output is published in the package.

For a repository-local `.env` that is ignored, untracked, and mode `600`, run:

```sh
node --env-file=.env scripts/live-verify.mjs
```

Do not redirect verifier output into a tracked file. No subscribed authenticated-success claim is made
until the complete structural verifier passes with an owner-provided eligible credential.

## Privacy and AI-tool safety

BattleMetrics player identifiers, IP-derived data, notes, flags, activity, and ban reasons may be
personal, private, or moderation-sensitive. Minimize collection, restrict workflow access, choose the
least privilege token, and apply your retention and disclosure obligations.

Never include access tokens, organization details, private player identifiers, private moderation data,
notes, ban reasons, flags, or unredacted API responses in issues. Use synthetic examples.

The node sets `usableAsTool: true`. All current actions are read-only, use only the Server resource, and
use a fixed origin. If destructive operations are added later, workflows using AI agents must place
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
