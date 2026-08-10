# Community testing

Normal tests and CI are fully synthetic and must never contact BattleMetrics.

The repository provides `pnpm run verify:live`. It fails closed unless
`BATTLEMETRICS_ACCESS_TOKEN` is non-empty. It performs bounded, read-only Server and Game collection
requests and follows at most one validated next link for each. When `BATTLEMETRICS_SERVER_ID` is also
set, it retains Server Get and the synthetic missing-server check. When `BATTLEMETRICS_PLAYER_ID` is
set, it performs one owner-approved Player Get and one synthetic missing-player check. It always performs one synthetic
invalid-token check. It summarizes status,
content type, structural key names, pagination form and target validity, safe numeric/rate/cache
headers, timing, and normalized categories. It does not log authorization headers, token values,
resource IDs, response bodies, full URLs, or resource values and is not run by normal tests or CI.

With an ignored, untracked, mode-`600` repository-local `.env`, run:

```sh
node --env-file=.env scripts/live-verify.mjs
```

Never print or inspect `.env` contents, redirect verifier output to a tracked path, or pass a token as a
process argument. Use a subscribed test account, a least-privilege token, and an owner-approved server
ID when running the optional Server checks and an owner-approved Player ID for Player Get. Never use
the verifier for player search, collection enumeration, platform identifiers, or private identifiers.
Never extend the harness to writes without a separate
approved phase.

Phase 1F did not add Ban List or Ban checks. The existing token has no optional moderation permissions,
the current first-party contract panels could not be inspected from this environment, and no
owner-controlled Ban List ID or existing safe Ban ID was configured. Do not add either ID variable or
probe a moderation endpoint until the signed-in developer UI confirms the exact read scopes and
organization permissions and a separate least-privilege subscribed token is available. Never create a
ban to manufacture a read target.

The Premium subscribed verifier passed on 2026-08-04. The sanitized result established successful
Server Get and Server Get Many, one absolute same-origin keyset page follow, `401 invalidCredential`,
and `404 resourceNotFound`. Successful responses used `application/json` with JSON:API-shaped `data`,
`included`, and collection `links`; no raw body or live value was retained. Repeat only when a release
change affects transport, validation, pagination, output, or error normalization.

The Phase 1D run also established `GET /games` returning two adjacent 10-item `game` pages as
`200 application/json`, with exact string IDs, no duplicate primary IDs, no `included`, `meta`,
`jsonapi`, or relationships, and absolute same-origin `/games` next links using opaque `page[key]` and
`page[rel]`. No REST rate-limit header was observed. The response used public cache control and exposed
`api-version: 0.1.0`; only key names and safe header values were retained.

The Phase 1E run established `GET /players/{playerId}` returning one exact-string `player` as
`200 application/json`, with attribute keys `createdAt`, `id`, `name`, `positiveMatch`, `private`, and
`updatedAt`, no relationships, an empty `included` array, and no top-level `links`, `meta`, or `jsonapi`.
Synthetic ID `0` returned `404 resourceNotFound`. No quota or `Retry-After` header appeared. The verifier
discarded every player value and did not call `GET /players`.

Phase 1C subsequently installed one exact tarball into a disposable n8n profile and exercised the real
n8n 2.30.6 editor on localhost with Node.js 24.18.0. The browser discovered BattleMetrics, displayed its
two actions, showed a password-protected BattleMetrics API credential without a test button, and ran
Server Get plus bounded Get Many limits 1, 5, 10, and 11. The observed collection page contained 10
primary resources, so Limit 11 followed exactly one safe next link. Stored execution checks confirmed
string IDs, raw envelope preservation, ordering, local trimming, page context, pairing, and absence of
credential or Authorization data. A disposable two-input workflow also confirmed stable success/error
ordering and continue-on-fail behavior.

Phase 1D repeated the exact-artifact check with a fresh profile. The n8n 2.30.6 editor exposed Game Get
Many, Return All, and Limit with the expected descriptions and credential selector, while exposing no
Custom API Call. The checked-in Game example imported. Live Limit 5 returned five resources; Limit 11
followed one safe page and returned 11 resources in a combined envelope with two source-page contexts
and no root pagination links. IDs remained strings. Sanitized execution inspection found no token,
Authorization header, or Bearer text. The temporary profile, SQLite database, execution output, npm
cache, installed package, and tarball were deleted.

Phase 1E repeated the exact-artifact check with a fresh localhost-only n8n 2.30.6 profile on Node.js
24.18.0. Protected editor metadata showed `game`, `player`, and `server`, only Player Get under Player,
the exact Player ID distinction text, `usableAsTool`, a password-protected credential, no credential test,
and no generic authentication proxy. The checked-in Player example imported. Live Player Get passed,
and a two-input workflow produced paired success and synthetic-missing outputs with
`resourceNotFound`/404 under Continue On Fail. Both executions streamed directly through in-memory
sanitizers; no raw response or execution output was written. Sanitizers reported no token,
Authorization, or Bearer text. The credential, database, workflows, cookies, logs, npm cache, profile,
and exact tarball were removed.

## Signed webhook trigger

Phase 2A added offline known-answer, exact-byte mutation, media-type, output-redaction, and webhook
boundary coverage. On 2026-08-04, the exact packed artifact was installed in a fresh localhost-only n8n
2.30.6 profile. Its generic receiver example imported, the Test URL accepted signed JSON, and the active
Production URL accepted signed JSON, Unicode text, and an empty text body. Production requests with an
invalid signature, no signature, an unsupported media type, malformed signed JSON, and a whitespace
mutation of a previously signed body returned the intended 401, 415, or 400 without starting executions.
All accepted requests returned an empty 200 response in 8--40 ms while a downstream Wait node remained
blocked for three seconds. Four stored synthetic executions contained only the parsed body and safe
webhook metadata; inspection found no shared secret, signature header, authorization or cookie material,
or raw-body duplicate. The disposable profile, database, logs, installed package, proof scripts, npm
cache, extracted files, and tarball were deleted after the final artifact measurements were recorded.

Phase 2B then completed owner-run, real BattleMetrics-originated verification. A native Server Action
provided the deterministic manual connectivity check: BattleMetrics received HTTP 200 and n8n created
exactly one verified execution. On an owner-controlled, BattleMetrics RCON-connected Insurgency 2014
server, two deliberate map changes caused two native Started Map events; each produced one automatic
HTTP 200 webhook and one verified execution without n8n polling or a manual BattleMetrics action.

The inspected outputs contained the signed timestamp, BattleMetrics request ID, normalized
`application/json` content type, and configured JSON body. They did not contain the shared secret,
signature header, raw-body duplicate, Authorization data, cookies, or full headers. No live server ID,
address, RCON password, webhook URL or secret, request ID, raw header set, or execution export was
retained. Do not repeat external webhook testing unless a later phase explicitly requires it.

Native trigger management was found under BattleMetrics RCON / Triggers. Practical setup required a
server controlled by the user and connected to BattleMetrics RCON; an arbitrary public server ID was
not enough. Started Map is the preferred deterministic automatic example, while Server Action remains
the recommended manual test. Server Update was extremely noisy in live use and should not be used as a
generic notification example without filtering. See [the webhook setup guide](battlemetrics-webhook-setup.md).

The real publicly reachable deployment reported n8n 2.32.6. This is owner-provided environment evidence
from the already completed verification, not a Phase 2C production inspection or compatibility claim
for every n8n 2.x release. The earlier isolated packed-artifact checks used n8n 2.30.6 on Node.js
24.18.0. See [the compatibility record](compatibility.md).

Do not run live Return All merely to prove pagination: the collection can be large. The live Limit 11
check is the bounded two-page proof; Return All termination, caps, ordering, included deduplication, and
unsafe-link handling remain covered with controlled mocked responses.

Before filtered collection reads, verify every query field in current first-party documentation and use
synthetic search criteria and small limits. Before any moderation test,
provide a disposable organization and ban list, a synthetic player/identifier permitted for testing, an
explicit cleanup plan, and human approval. Writes must run serially and verify both the intended mutation
and cleanup. Do not use production organizations, real ban reasons, player notes, flags, or private
identifiers.

Record the BattleMetrics plan/subscription, token scopes, organization role permissions, test timestamp,
and API response headers without secret values. Disable and revoke the token after testing.
