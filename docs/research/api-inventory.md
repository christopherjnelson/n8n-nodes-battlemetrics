# BattleMetrics API research inventory

Research dates: **2026-08-02**, reviewed **2026-08-04**

Status: foundation decision record, not a claim that all listed endpoints are implemented

## Method and evidence quality

Authoritative sources consulted:

1. [BattleMetrics developer documentation](https://www.battlemetrics.com/developers/documentation)
   and its API explorer. This is the canonical contract, but the research browser, direct HTTP, and a
   fresh cookie-free headless browser were denied (`robots.txt` or HTTP 403). Individual endpoint detail
   panels, exact scopes, and examples therefore could not be captured.
2. [BattleMetrics developer area](https://www.battlemetrics.com/developers), the first-party location
   for personal access tokens. Its authenticated UI was not accessed; no browser cookie or private
   session API was used.
3. First-party BattleMetrics knowledge-base material:
   [overview](https://learn.battlemetrics.com/article/36-overview),
   [webhooks](https://learn.battlemetrics.com/article/47-webhooks),
   [audit log](https://learn.battlemetrics.com/article/62-audit-log),
   [data sharing](https://learn.battlemetrics.com/article/49-data-sharing), and
   [trigger types](https://learn.battlemetrics.com/article/8-trigger-types).
4. Safe read-only `GET /servers?page[size]=1` requests to the official API origin with
   `Accept: application/vnd.api+json`: no Authorization header returned HTTP 403 with a subscription
   requirement, while an obviously invalid synthetic Bearer token returned HTTP 401 identifying an
   invalid or expired token. No private data was requested or received.
5. A bounded Premium subscribed run on 2026-08-04: configured Server Get, Server Get Many, one returned
   next link, one synthetic invalid token, and one synthetic in-range missing Server ID. Only status,
   media type, structural member/key names, pagination form/query-key names, safe headers, and identity
   equality were retained. No response body, credential, configured ID, or live resource value was
   written to disk or committed.

Third-party libraries and community examples were used only to discover questions and likely resource
names. They are not cited as contract evidence and do not promote an endpoint to “supported.”

### Evidence labels

- **Officially documented**: current first-party material directly states the finding.
- **Directly observed**: a safe request to the current first-party service demonstrated the finding.
- **Inferred**: evidence suggests the finding, but it is not sufficient for implementation.
- **Unresolved**: current first-party evidence or a suitable observation was unavailable. Unresolved and
  inferred values are not implemented.

## Origin, versioning, authentication, and account context

| Field                    | Finding                                                                                                                                                            | Confidence/source                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| REST origin              | `https://api.battlemetrics.com`                                                                                                                                    | Officially documented; directly observed                                               |
| Version path             | No `/v1` path is used by the documented origin                                                                                                                     | Directly observed for `/servers`; broader version policy unresolved                    |
| Version header           | Live 401/403 included `api-version: 0.1.0`                                                                                                                         | Directly observed; meaning/change policy unresolved                                    |
| Personal access tokens   | Created in the signed-in developer area's Personal Access Tokens section; sent as Bearer authentication                                                            | Developer area/documentation taxonomy; exact UI labels and lifecycle must be rechecked |
| OAuth                    | OAuth-related capabilities may exist in the developer system, but supported grants, application registration, redirect rules, and scopes were not accessible       | Unresolved; not implemented                                                            |
| Authentication guidance  | Historical official documentation says to include Authorization on requests; current anonymous request is blocked by subscription enforcement                      | Partially confirmed; this node requires credentials for every operation                |
| Subscription             | Anonymous Server collection returned subscription `403`; a Premium subscribed token completed Server Get/Get Many with `200`                                       | Directly observed on 2026-08-02 and 2026-08-04; other plan interactions unresolved     |
| Credential test          | Invalid and valid-subscribed states are verified; valid-unsubscribed and insufficient-scope states remain unresolved                                               | Network credential test remains removed; operations validate credentials               |
| Personal vs organization | Server directory data may be general; organizations, ban lists, bans, audit activity, notes, flags, and triggers can be personal or organization-owned             | First-party overview/audit/data-sharing material; endpoint-specific rules unresolved   |
| Permission model         | Organization roles restrict viewing and actions; audit log has a named “View Organization Audit Log” permission; organization webhooks need “Use Trigger Webhooks” | Officially documented examples only; exact API scope matrix unresolved                 |

The credential and transport always authenticate. An explicit anonymous mode may be considered only if
BattleMetrics first-party documentation later identifies endpoints that remain anonymous for subscribed
API access and defines how their responses differ. Silent optional authentication is rejected.

## `GET /servers` current contract

This table is the exact Phase 1A implementation boundary. Authentication-gated requests containing a
query key do not establish that the key is supported. Historical examples and wrappers are not promoted
to contract evidence.

| Contract field                     | Finding                                                                                                                                         | Evidence label / implementation                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Exact path                         | `GET https://api.battlemetrics.com/servers`                                                                                                     | **Officially documented** by the first-party explorer route; **Directly observed** at the official origin; implemented |
| Authentication behavior            | No header produced subscription `403`; a synthetic invalid token produced `401`; a Premium subscribed token produced `200` for Get and Get Many | **Directly observed**; valid-unsubscribed and insufficient-scope states remain **Unresolved**                          |
| Subscription requirement           | Anonymous access was subscription-gated and the Premium subscribed token succeeded; other eligible plans and token interactions are unknown     | **Directly observed** gate and Premium success; broader plan behavior **Unresolved**                                   |
| Required scopes                    | No current scope name was accessible                                                                                                            | **Unresolved**; no scope claim                                                                                         |
| Supported filters                  | No filter list was accessible                                                                                                                   | **Unresolved**; none exposed                                                                                           |
| Text-search parameter              | Exact key, syntax, and matching behavior unavailable                                                                                            | **Unresolved**; deferred                                                                                               |
| Game filter                        | Exact key and accepted BattleMetrics game-identifier format unavailable                                                                         | **Unresolved**; deferred. A game identifier must not be guessed from a display name                                    |
| Country/region filters             | Exact keys, code formats, combination behavior, and distinction between country and region unavailable                                          | **Unresolved**; deferred                                                                                               |
| Status filter                      | Exact key and allowed values unavailable                                                                                                        | **Unresolved**; deferred                                                                                               |
| Sorting                            | Sort key, fields, direction syntax, defaults, and stability unavailable                                                                         | **Unresolved**; deferred                                                                                               |
| Includes                           | Allowed relationships, value syntax, authorization effects, and cost unavailable                                                                | **Unresolved**; deferred                                                                                               |
| Page-size parameter                | A probe used `page[size]`, but authentication failed before parameter behavior could be established                                             | **Unresolved**; not sent by the node                                                                                   |
| Maximum page size                  | No first-party value was accessible                                                                                                             | **Unresolved**                                                                                                         |
| Offset/cursor/other page parameter | Returned links used `page[key]` and `page[rel]`; values are opaque and were not retained                                                        | **Directly observed** link state; not exposed as user controls                                                         |
| `links.next` form                  | Page one and page two returned absolute HTTPS links on `api.battlemetrics.com` with the `/servers` path                                         | **Directly observed**; safely followed once                                                                            |
| Successful response media type     | `application/json` despite requesting `application/vnd.api+json`                                                                                | **Directly observed** for Server Get and two collection pages; accepted by transport                                   |
| Error response media type          | Both observed `401` and `403` responses used `application/json`                                                                                 | **Directly observed**                                                                                                  |
| Successful collection envelope     | Top-level `data`, `included`, and `links`; `data` contained only `server` resources with exact string IDs; no top-level `meta` or `jsonapi`     | **Directly observed** on two adjacent pages; validated and preserved                                                   |
| Empty collection behavior          | No successful empty result was available                                                                                                        | **Unresolved**; mocked behavior safely accepts `data: []`                                                              |
| Error envelope                     | Top-level `errors` array with status/title/detail; the observed `401` used a numeric status while the `403` used a string                       | **Directly observed**; safely normalized                                                                               |
| Rate-limit headers                 | No quota/remaining/reset header was present on subscribed `200`, invalid-token `401`, or missing-server `404` responses                         | Header absence **Directly observed** for this bounded matrix; actual limits **Unresolved**                             |
| `Retry-After` behavior             | No observed response contained `Retry-After`; no `429` was deliberately induced                                                                 | Absence **Directly observed** for the bounded matrix; `429` behavior **Unresolved**                                    |
| Documented request quotas          | No current first-party REST quota was accessible                                                                                                | **Unresolved**; outbound-webhook quotas are not reused                                                                 |

Accordingly, Get Many sends a minimal request with no query object. Return All and Limit are local node
controls, not claims about BattleMetrics query parameters.

Both observed collection pages contained ten `server` resources, an empty `included` array, and no
top-level `meta` or `jsonapi`. Page one had `links.next`; page two had `links.next` and `links.prev`.
Both next links were absolute, same-origin, HTTPS `/servers` targets using `page[key]` and `page[rel]`.
Primary IDs were exact strings and no duplicate occurred across the adjacent pages. The union of
attribute keys matched the single-resource list below. Relationships included `game`, with
`serverGroup` also present on page one. These are structural observations only; values were discarded.

## `GET /servers/{id}` subscribed contract

The configured Server request returned `200 application/json` with top-level `data` and an empty
`included` array. `data` was one `server` resource, its primary ID remained an exact string and matched
the configured ID, and it had a `game` relationship. Attribute keys were `address`, `country`,
`createdAt`, `details`, `id`, `ip`, `location`, `maxPlayers`, `name`, `players`, `port`, `portQuery`,
`private`, `queryStatus`, `rank`, `status`, and `updatedAt`. Top-level `links`, `meta`, and `jsonapi` were
absent. The synthetic in-range missing ID returned `404 application/json` with one top-level JSON:API
error and normalized to `resourceNotFound`. All values in tests are synthetic; no live value was
retained.

## JSON:API and HTTP behavior

| Concern                   | Finding                                                                                                                 | Implementation decision / gap                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Accept media type         | Requests send `application/vnd.api+json`; subscribed successes returned `application/json`                              | Transport sends the vendor Accept value and accepts the observed JSON response                |
| Content-Type              | GET has no request body. Future JSON:API writes should send `application/vnd.api+json` only after endpoint verification | Transport architecture adds it when a body exists; no writes exposed                          |
| Success envelope          | Live Server Get used `data` plus empty `included`; collections added `links`; IDs remained strings                      | Typed, validated, preserved, and covered by sanitized structural fixtures                     |
| Null/empty data           | Supported by generic JSON:API foundation, but endpoint-specific null semantics are unresolved                           | Validator accepts `null` and empty arrays; operation layer still requires one Server resource |
| Error envelope            | Live 401/403 bodies used a top-level `errors` array with `status`, `title`, and `detail`; status type differed          | Directly observed. Error normalizer preserves concise fields and redacts secrets              |
| Live media type           | `application/json` on observed `200`, `401`, `403`, and `404` responses despite the vendor Accept value                 | Directly observed; JSON:API-shaped documents are validated independently of the header        |
| Observed response headers | `api-version: 0.1.0`, private cache control, and cache bypass; no REST quota headers                                    | Directly observed; only safe header names/values were retained                                |
| Common statuses           | Foundation covers 400, 401, 403, 404, 409, 422, 429, 500, 502, 503 plus timeout/network/DNS/malformed response          | Generic safety coverage, not proof every endpoint returns every code                          |

## Pagination, filtering, sorting, and includes

The official developer documentation is expected to define JSON:API-style collection parameters, but
its detail panels were inaccessible. Community examples suggest `page[size]`, offsets, filters,
`sort`, `include`, `fields[...]`, and top-level `links.next`; none is accepted here as the current
contract merely because a third-party example uses it.

| Field                 | Current record                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Pagination parameters | Returned links directly used opaque `page[key]` and `page[rel]`; user-supplied page-size/offset parameters remain unresolved    |
| Maximum page size     | Unresolved for every resource                                                                                                   |
| `links.next`          | Absolute same-origin HTTPS `/servers` link directly observed and safely followed once; page two also included `links.prev`      |
| Filters               | Endpoint-specific names, value formats, combinations, privacy effects, and escaping unresolved                                  |
| Sorting               | Allowed fields, leading-minus direction syntax, defaults, and stability unresolved                                              |
| Includes              | Allowed relationships, authorization effects, sparse fields, and cost unresolved                                                |
| Retry/timeout         | No official REST timeout or retry policy was accessible. Client timeout is 15 seconds and there is no internal retry/sleep loop |
| REST rate limit       | Limit, window, keying, and retry policy unresolved; no quota headers appeared in the bounded subscribed/error matrix            |

The documented webhook limits—45 requests/second and 300 requests/minute, with a five-second webhook
delivery timeout—describe **outbound BattleMetrics webhooks**, not inbound REST API consumption. They
must never be copied into the REST client without first-party REST evidence.

Server Get Many uses the pagination foundation. It accepts relative URLs or absolute HTTPS URLs only
when they resolve to exactly `https://api.battlemetrics.com/servers` without URL user information,
preserves order, detects repeated links, enforces 100-page and 10,000-primary-item defaults, and can stop
at a caller limit. The absolute same-origin form and `page[key]`/`page[rel]` key names are now directly
observed; accepting relative links remains a defensive JSON:API-compatible client rule.

### Server Get Many query classification (2026-08-04)

The first-party developer explorer was queried again but remained unavailable to automated retrieval.
Public BattleMetrics website list URLs use their own page and filter controls; those URLs are not REST
API contract evidence. The subscribed response promoted only returned pagination-link key names to
direct observation; no user-supplied query parameter was promoted.

| Potential parameter         | Classification    | Decision                                                                  |
| --------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `page[size]`                | Unresolved        | Previously probed only behind an authentication/subscription failure      |
| `page[offset]`              | Unresolved        | Historical/community evidence is insufficient; follow returned links only |
| `page[key]` and `page[rel]` | Directly observed | Opaque returned-link state; followed but not exposed as user controls     |
| Text search                 | Unresolved        | Exact key, syntax, and matching behavior remain unavailable               |
| Game                        | Unresolved        | Exact key and accepted identifier format remain unavailable               |
| Country / region            | Unresolved        | Exact keys, formats, and combination behavior remain unavailable          |
| Status                      | Unresolved        | Exact key and accepted values remain unavailable                          |
| Sorting                     | Unresolved        | Fields, direction syntax, defaults, and stability remain unavailable      |
| Includes                    | Unresolved        | Allowed relationships and permission/cost effects remain unavailable      |
| Sparse fieldsets            | Unresolved        | Resource-specific field keys and semantics remain unavailable             |

No Server Get Many API query parameter is implemented in this pass. Return All and Limit remain local
n8n controls, and pagination remains driven exclusively by validated `links.next` values.

## Candidate endpoint inventory

All GET candidates have no request body. Server single-resource and collection success shapes are
directly observed; other candidates still require subscribed live confirmation. Exact rate-limit
behavior remains unresolved for every row.

| Resource / proposed n8n operation | Method and exact candidate path       | Official source                                                                                                             | Auth, exact scope, context                                                                                                  | Path/query/filter/sort/include                                                                  | Pagination / max page size / next link                                           | Synthetic & eventual live suitability                                                     | Phase / status / key uncertainty                                                                                                                            |
| --------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server: Get                       | `GET /servers/{serverId}`             | [official developer docs – Server Get panel](https://www.battlemetrics.com/developers/documentation#link-GET-/servers/{id}) | Premium subscribed token succeeded; exact API scope unresolved; resource may be public-directory or organization-associated | Path: opaque Server ID, encoded as one segment. Query/includes unresolved and not exposed       | Not applicable                                                                   | Sanitized synthetic fixture plus successful bounded live check                            | **Implemented and subscribed-live verified.** `200 application/json`, exact string ID, Server attributes/relationship keys recorded; exact scope unresolved |
| Server: Get Many                  | `GET /servers`                        | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/servers)                         | Premium subscribed token succeeded; exact scope and other plan interactions unresolved                                      | No user API query parameters exposed; search/game/country/region/status/sort/include unresolved | Absolute returned `links.next` with opaque `page[key]`/`page[rel]` followed once | Sanitized synthetic fixture plus successful bounded two-page live check                   | **Implemented and subscribed-live verified.** Return All and local Limit only; no speculative query controls                                                |
| Player: Get                       | `GET /players/{playerId}`             | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/players/{id})                    | Exact token scope, profile visibility, data-sharing and organization permission unresolved                                  | Path: opaque Player ID. Includes/fields unresolved                                              | Not applicable                                                                   | Synthetic: yes. Live: only owner-approved non-sensitive fixture; responses can be private | Proposed `0.1.0`; **not implemented**; privacy contract blocks work                                                                                         |
| Player: Get Many/Search           | `GET /players`                        | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/players)                         | Exact scope; personal/organization data-sharing visibility unresolved                                                       | Search/server/identifier filters, sort, includes and external-identifier semantics unresolved   | All fields and maximum unresolved                                                | Synthetic: yes after verification. Live: sensitive; dedicated fixture required            | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Game: Get Many                    | `GET /games`                          | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/games)                           | Exact authentication/subscription requirement unresolved; no organization context expected but not proven                   | Filters/sort/include unresolved; game identifier is a string, distinct from resource IDs        | All fields and maximum unresolved                                                | Synthetic: yes. Live: likely safest collection once subscription access exists            | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Organization: Get                 | `GET /organizations/{organizationId}` | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/organizations/{id})              | Exact API scope and membership/role permission unresolved; organization context                                             | Path: opaque Organization ID; query/includes unresolved                                         | Not applicable                                                                   | Synthetic: yes. Live: private; dedicated test organization only                           | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Organization: Get Many            | `GET /organizations`                  | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/organizations)                   | Whether results mean memberships, discovery, or both is unresolved; exact scope unresolved                                  | Filters/sort/includes unresolved                                                                | All fields and maximum unresolved                                                | Synthetic: yes. Live: dedicated account with test organization                            | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Ban List: Get                     | `GET /ban-lists/{banListId}`          | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/ban-lists/{id})                  | Exact scope and organization role/resource permission unresolved                                                            | Path: opaque Ban-list ID; includes unresolved                                                   | Not applicable                                                                   | Synthetic: yes. Live: disposable empty list only                                          | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Ban List: Get Many                | `GET /ban-lists`                      | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/ban-lists)                       | Personal versus organization lists and exact permission unresolved                                                          | Organization/filter/sort/include fields unresolved                                              | All fields and maximum unresolved                                                | Synthetic: yes. Live: dedicated account/org                                               | Proposed `0.1.0`; **not implemented**                                                                                                                       |
| Ban: Get                          | `GET /bans/{banId}`                   | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/bans/{id})                       | Exact scope and ban-list/org permission unresolved; moderation-sensitive                                                    | Path: opaque Ban ID; include semantics unresolved                                               | Not applicable                                                                   | Synthetic: yes. Live: owner-created synthetic ban only                                    | Proposed `0.1.0`; **not implemented**; sensitive fields require minimization                                                                                |
| Ban: Get Many                     | `GET /bans`                           | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/bans)                            | Exact scope/list/org permission unresolved; moderation-sensitive                                                            | Ban-list/player/org/status/date filters, sort, includes unresolved                              | All fields and maximum unresolved                                                | Synthetic: yes. Live: disposable list with synthetic records and small limit              | Proposed `0.1.0`; **not implemented**                                                                                                                       |

The URL fragments above identify the intended first-party panels but could not be fetched in this
environment. They must be opened manually and every unresolved cell transcribed before implementation.
If a fragment has changed, search the first-party explorer rather than relying on the stale fragment.

## Deferred sensitive and event resources

No exact path is recorded below when it could not be confirmed. That is deliberate: inventing a likely
JSON:API path would turn a research gap into an undocumented endpoint.

| Resource           | Candidate operations              | Exact path                          | First-party findings                                                                                              | Decision / remaining contract fields                                                                               |
| ------------------ | --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Player identifiers | Read/search                       | **Unresolved**                      | Data-sharing documentation says identifiers can be shared, restricted, searched, and used for bans                | Defer. Need method/path, identifier types, visibility redaction, scope, filters, envelopes, audit behavior         |
| Player notes       | Get/Create/Update/Delete          | **Unresolved**                      | Audit article says personal player notes are commonly exempt from organization audit logging                      | Defer sensitive data. Need ownership, scope, body, retention, audit, and delete semantics                          |
| Player flags       | Get/Create/Update/Delete          | **Unresolved**                      | First-party help center exposes flag creation/editing as an account feature                                       | Defer. Need path, permissions, attributes, visibility, and safe write strategy                                     |
| Activity / audit   | Get Many                          | **Unresolved**                      | Audit records include API request/resource/action context; “View Organization Audit Log” is a named permission    | Defer. Need distinguish server activity from organization audit, paths, scope, retention, paging, sensitive fields |
| Triggers           | Read/write                        | **Unresolved**                      | Trigger types include player join/update/leave and server update, plus game-specific types                        | Defer all. Need paths, schemas, actions, organization/personal ownership, scope, evaluation behavior               |
| Outbound webhooks  | Configure through trigger actions | **No standalone endpoint verified** | First-party help says webhook is an action added to a trigger; organization usage requires “Use Trigger Webhooks” | No webhook node or API write. Need official API representation, signatures, secrets, URLs, and mutation contract   |
| Websocket stream   | Subscribe                         | Not a REST endpoint                 | First-party help explicitly says websocket documentation is not available and points to a Discord example         | Prohibited/deferred; do not reverse engineer                                                                       |

## Ban write candidates (not recommended for `0.1.0`)

The official explorer is expected to cover Ban create/update/delete, but the following required fields
were not recoverable: exact methods and paths, JSON:API `data.type`, attributes and relationships,
required versus optional values, identifier matching, duplicate/conflict behavior, expiration format,
organization and ban-list permission names, response status/envelope, delete versus revoke semantics,
audit effects, and idempotency. No method/path/body is inferred here. These operations are not
implemented and not suitable for autonomous AI use.

## Public versus authenticated behavior

The current results prove that this research environment cannot anonymously read the Server collection
without a subscription, that an obviously invalid Bearer token is rejected distinctly with `401`, and
that the tested Premium subscribed token can read the configured Server and Server collection. They do
not prove that a Bearer token alone is sufficient without an eligible plan, that a valid non-subscribed
token is authenticated before the subscription gate, that all resources behave identically, or that
historically public data is private. A future owner-credential matrix should test, with no captured
browser state:

1. a valid personal token without eligible API access;
2. a valid token lacking the endpoint's scope;
3. a valid token with scope but without resource/organization permission.

Record only status, safe headers, error schema, and a structural success assertion. This distinguishes
subscription 403, scope/permission 403, resource 403/404, and success without disclosing response
content. The anonymous and invalid-token rows are already recorded and need not be repeated routinely.

## Competition and package-name research

Checked 2026-08-02:

- `npm view n8n-nodes-battlemetrics version` returned registry `E404 Not Found`; the exact unscoped name
  appeared available at that moment.
- `npm search --json battlemetrics n8n` returned the third-party BattleMetrics client
  `@leventhan/battlemetrics` but no BattleMetrics-specific n8n community node.
- Web searches for the exact name and BattleMetrics + n8n across GitHub, npm, n8n integrations/community
  listings, the n8n community forum, and the creator ecosystem found no equivalent public node.
- The current official n8n tool is `npm create @n8n/node@latest`; registry checks found
  `@n8n/node-cli` 0.41.2 and `@n8n/create-node` 0.41.0. The reference template was generated with
  `pnpm dlx @n8n/node-cli@0.41.2 new n8n-nodes-battlemetrics --skip-install --template programmatic/example`
  in `/tmp` and adapted directly into this repository without the generated publishing workflow.

Search indexing is incomplete and cannot establish that no private, unpublished, newly created, scoped,
or differently named implementation exists. npm name availability can also change before publication;
the owner must recheck it immediately before release.

## Required next research capture

An owner with legitimate first-party developer-doc access should export or manually record each proposed
read panel's method, path, description, authentication, exact scope, resource permission, parameters,
filters, sort, includes, page model/maximum, request/response media types, response example, statuses,
and error/rate headers. Then run the safe structural live matrix using dedicated resources. Until that
happens, only the Server resource is presented in the UI. Get and conservative Get Many both carry the
documented live-confirmation limitation; all query filters and every other resource remain deferred.
