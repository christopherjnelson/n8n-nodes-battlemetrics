# n8n-nodes-battlemetrics

An early-development, unofficial n8n community node for the BattleMetrics API. This project is not
affiliated with, endorsed by, or sponsored by BattleMetrics.

[BattleMetrics](https://www.battlemetrics.com/) provides game-server monitoring, player history, and
server administration services. This package is intentionally conservative because player and
moderation records can contain sensitive data.

## Current scope

The foundation implements one operation:

- **Server → Get**: `GET https://api.battlemetrics.com/servers/{serverId}`

It also includes typed transport, input validation, JSON:API validation and preservation, bounded
same-origin pagination infrastructure, safe error normalization, and mocked tests. Pagination is not
yet exposed by the single-resource operation. There is no trigger node, websocket support, arbitrary
request operation, moderation write, or user-configurable API host.

The proposed `0.1.0` endpoint scope is broader than the currently implemented scope: Server Get/Get
Many, Player Get/Get Many, Game Get Many, Organization Get/Get Many, Ban List Get/Get Many, and Ban
Get/Get Many. Every operation except Server Get remains deferred until its current official method,
parameters, permissions, and response contract can be re-verified. Ban create, update, and delete are
not recommended for `0.1.0`.

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
```

`pnpm run dev` starts the development environment provided by the official n8n node CLI. Compatibility
outside the versions recorded above has not been established. The package declares Node.js 22 or newer
because the current official scaffold supports modern maintained Node releases; CI checks Node 22 and 24.

## Authentication

All operations require the **BattleMetrics API** credential. Store a BattleMetrics personal access
token in its **Access Token** field. The credential adds `Authorization: Bearer …` through n8n's
credential system. The token is never a node parameter, output field, log field, fixture, or error
detail.

To create a token, sign in to BattleMetrics, open the official
[developer area](https://www.battlemetrics.com/developers), select **Personal Access Tokens**, create a
token, and save it immediately in n8n credentials. Choose only the permissions needed by your intended
operations and protect the token like a password. The official documentation page was protected from
automated access during the 2026-08-02 research pass, so labels and available permissions must be
checked in the live developer UI before use.

The credential intentionally has no fabricated test request. No cheap endpoint was verified that
distinguishes an invalid token from a valid token lacking the now-required API subscription.

### Permission status

| Operation group          | Token required by this node | Exact BattleMetrics permission/scope                               |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| Server Get               | Yes                         | Unresolved in accessible official documentation                    |
| Proposed read operations | Yes                         | Unresolved per endpoint; must be verified before implementation    |
| Moderation writes        | Not implemented             | Unresolved; organization role/resource permission is also expected |

An anonymous request made during research returned `403` with “A subscription is required to use the
API.” Authentication does not override BattleMetrics account, subscription, organization, or resource
permissions.

## Output, pagination, and errors

Server Get returns one n8n item containing the complete JSON:API envelope. `data`, `attributes`,
`relationships`, `included`, `links`, and `meta` are not flattened away. The item is linked to its source
with `pairedItem`.

The reusable pagination layer follows `links.next`, accepts relative links and absolute HTTPS links on
`api.battlemetrics.com`, rejects all other origins and protocols, preserves page order, detects repeated
links, and enforces page/item caps. It performs no sleep or retry loop. Collection operations have not
yet been wired to it because their current endpoint contracts still require verification.

Errors preserve concise JSON:API status/title/detail information plus operation and input-item context.
Bearer tokens, authorization/cookie values, and oversized text are redacted or truncated. With
**Continue On Fail**, processing continues and a paired concise error item is returned. `Retry-After` is
validated but automatic retry is deliberately deferred.

BattleMetrics' current REST request quota and reset headers were not available in accessible official
documentation. The documented outbound-webhook limits are a different system and are not used as REST
limits here.

## Privacy and AI-tool safety

BattleMetrics player identifiers, IP-derived data, notes, flags, activity, and ban reasons may be
personal, private, or moderation-sensitive. Minimize collection, restrict workflow access, choose the
least privilege token, and apply your retention and disclosure obligations.

Never include access tokens, organization details, private player identifiers, notes, ban reasons,
flags, or unredacted API responses in issues. Use synthetic examples.

The node sets `usableAsTool: true`. Today its only action is read-only, accepts a specifically labeled
Server ID, and uses a fixed origin. If destructive operations are added later, workflows using AI agents
must place them behind explicit human approval and narrow credentials; ambiguous autonomous moderation
is unsafe.

## Project guidance

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Community testing](docs/community-testing.md)
- [Release readiness](docs/release-readiness.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Changelog](CHANGELOG.md)

## License

MIT. Copyright © 2026 Christopher J. Nelson. See [LICENSE](LICENSE).
