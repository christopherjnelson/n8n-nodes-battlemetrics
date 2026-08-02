# BattleMetrics API research inventory

Research date: **2026-08-02**  
Status: foundation decision record, not a claim that all listed endpoints are implemented

## Method and evidence quality

Authoritative sources consulted:

1. [BattleMetrics developer documentation](https://www.battlemetrics.com/developers/documentation)
   and its API explorer. This is the canonical contract, but both the research browser and direct HTTP
   requests were denied (`robots.txt` and HTTP 403 respectively). Individual endpoint detail panels,
   exact scopes, and examples therefore could not be captured.
2. [BattleMetrics developer area](https://www.battlemetrics.com/developers), the first-party location
   for personal access tokens. Its authenticated UI was not accessed; no browser cookie or private
   session API was used.
3. First-party BattleMetrics knowledge-base material:
   [overview](https://learn.battlemetrics.com/article/36-overview),
   [webhooks](https://learn.battlemetrics.com/article/47-webhooks),
   [audit log](https://learn.battlemetrics.com/article/62-audit-log),
   [data sharing](https://learn.battlemetrics.com/article/49-data-sharing), and
   [trigger types](https://learn.battlemetrics.com/article/8-trigger-types).
4. A safe anonymous `GET /servers?page[size]=1` request to the official API origin with
   `Accept: application/vnd.api+json`. It returned HTTP 403 and a 118-byte error document; no private
   data was requested or received.

Third-party libraries and community examples were used only to discover questions and likely resource
names. They are not cited as contract evidence and do not promote an endpoint to “supported.”

### Evidence labels

- **Confirmed**: directly visible first-party material or observed current behavior establishes the
  field needed by the implementation.
- **Candidate**: the resource/operation is present in the official developer API taxonomy or specified
  for investigation, but at least one contract field could not be recovered. It is not supported.
- **Unresolved**: no current first-party evidence was accessible. No value is inferred from a wrapper.

## Origin, versioning, authentication, and account context

| Field                    | Finding                                                                                                                                                            | Confidence/source                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| REST origin              | `https://api.battlemetrics.com`                                                                                                                                    | Confirmed by official developer URL conventions and live response                      |
| Version path             | No `/v1` path is used by the documented origin                                                                                                                     | Confirmed for observed `/servers`; broader version policy unresolved                   |
| Version header           | Live 403 included `api-version: 0.1.0`                                                                                                                             | Observed; meaning/change policy unresolved                                             |
| Personal access tokens   | Created in the signed-in developer area's Personal Access Tokens section; sent as Bearer authentication                                                            | Developer area/documentation taxonomy; exact UI labels and lifecycle must be rechecked |
| OAuth                    | OAuth-related capabilities may exist in the developer system, but supported grants, application registration, redirect rules, and scopes were not accessible       | Unresolved; not implemented                                                            |
| Authentication guidance  | Historical official documentation says to include Authorization on requests; current anonymous request is blocked by subscription enforcement                      | Partially confirmed; this node requires credentials for every operation                |
| Subscription             | Anonymous Server collection request returned `403` “Access denied. A subscription is required to use the API.”                                                     | Confirmed on 2026-08-02; applicable plans and token interactions unresolved            |
| Credential test          | No cheap endpoint was verified that isolates token validity from subscription/resource permission                                                                  | No test request implemented; `/me` was not invented                                    |
| Personal vs organization | Server directory data may be general; organizations, ban lists, bans, audit activity, notes, flags, and triggers can be personal or organization-owned             | First-party overview/audit/data-sharing material; endpoint-specific rules unresolved   |
| Permission model         | Organization roles restrict viewing and actions; audit log has a named “View Organization Audit Log” permission; organization webhooks need “Use Trigger Webhooks” | Confirmed examples only; exact API scope matrix unresolved                             |

The credential and transport always authenticate. An explicit anonymous mode may be considered only if
BattleMetrics first-party documentation later identifies endpoints that remain anonymous for subscribed
API access and defines how their responses differ. Silent optional authentication is rejected.

## JSON:API and HTTP behavior

| Concern                   | Finding                                                                                                                             | Implementation decision / gap                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Accept media type         | `application/vnd.api+json` is the documented/expected JSON:API negotiation value; research request sent it                          | Transport sends it on every request; successful response content type still needs live verification |
| Content-Type              | GET has no request body. Future JSON:API writes should send `application/vnd.api+json` only after endpoint verification             | Transport architecture adds it when a body exists; no writes exposed                                |
| Success envelope          | Expected top-level `data`, with optional `included`, `links`, `meta`, relationships, and string IDs                                 | Typed/validated and preserved; current subscription gate prevented observing a live success         |
| Null/empty data           | Supported by generic JSON:API foundation, but endpoint-specific null semantics are unresolved                                       | Validator accepts `null` and empty arrays; operation layer still requires one Server resource       |
| Error envelope            | Live 403 body: top-level `errors` array containing `status`, `title`, and `detail` strings                                          | Confirmed. Error normalizer preserves concise fields and redacts secrets                            |
| Live error media type     | `application/json` on observed subscription 403, despite requested vendor media type                                                | Parser does not assume error Content-Type; successful vendor type remains to verify                 |
| Observed response headers | `api-version`, `request-id` in CORS allow-list, `response-time` in CORS allow-list; the particular 403 did not expose quota headers | Headers are handled defensively; no rate-limit guesses                                              |
| Common statuses           | Foundation covers 400, 401, 403, 404, 409, 422, 429, 500, 502, 503 plus timeout/network/DNS/malformed response                      | Generic safety coverage, not proof every endpoint returns every code                                |

## Pagination, filtering, sorting, and includes

The official developer documentation is expected to define JSON:API-style collection parameters, but
its detail panels were inaccessible. Community examples suggest `page[size]`, offsets, filters,
`sort`, `include`, `fields[...]`, and top-level `links.next`; none is accepted here as the current
contract merely because a third-party example uses it.

| Field                 | Current record                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pagination parameters | `page[size]` was accepted syntactically by the attempted request but authorization failed before results; offset/cursor fields unresolved |
| Maximum page size     | Unresolved for every resource                                                                                                             |
| `links.next`          | Expected from the JSON:API collection contract, but current relative/absolute form was not observable                                     |
| Filters               | Endpoint-specific names, value formats, combinations, privacy effects, and escaping unresolved                                            |
| Sorting               | Allowed fields, leading-minus direction syntax, defaults, and stability unresolved                                                        |
| Includes              | Allowed relationships, authorization effects, sparse fields, and cost unresolved                                                          |
| Retry/timeout         | No official REST timeout or retry policy was accessible. Client timeout is 15 seconds and there is no internal retry/sleep loop           |
| REST rate limit       | Limit, window, keying, remaining/reset headers, and retry policy unresolved                                                               |

The documented webhook limits—45 requests/second and 300 requests/minute, with a five-second webhook
delivery timeout—describe **outbound BattleMetrics webhooks**, not inbound REST API consumption. They
must never be copied into the REST client without first-party REST evidence.

The pagination foundation accepts relative URLs or absolute HTTPS URLs only when they resolve to exactly
`https://api.battlemetrics.com`, preserves order, detects repeated links, enforces 100-page and
10,000-item internal defaults, and can stop at a caller limit. Collection operations remain unexposed.

## Candidate endpoint inventory

All GET candidates have no request body. Their expected success status is 200 and their expected shape is
a JSON:API single-resource or collection document. Those shared expectations require a subscribed live
confirmation. Errors are expected as JSON:API error documents, with the observed subscription 403 as the
only current live example. Exact rate-limit behavior is unresolved for every row.

| Resource / proposed n8n operation | Method and exact candidate path       | Official source                                                                                                             | Auth, exact scope, context                                                                                                                            | Path/query/filter/sort/include                                                                | Pagination / max page size / next link                       | Synthetic & eventual live suitability                                                                  | Phase / status / key uncertainty                                                                                                                                       |
| --------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server: Get                       | `GET /servers/{serverId}`             | [official developer docs – Server Get panel](https://www.battlemetrics.com/developers/documentation#link-GET-/servers/{id}) | Credential required by node; exact API scope unresolved; subscription currently enforced; resource may be public-directory or organization-associated | Path: opaque Server ID, encoded as one segment. Query/includes unresolved and not exposed     | Not applicable                                               | Synthetic mocked test: yes. Live: yes, with owner-approved server and subscribed least-privilege token | **Implemented foundation operation.** Method/path/resource type considered sufficiently established; attributes/media type/permissions still require live confirmation |
| Server: Get Many/Search           | `GET /servers`                        | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/servers)                         | Exact scope and public/authenticated difference unresolved; current anonymous request denied for subscription                                         | Candidate search/game/organization filters, sort, include, sparse fields all unresolved       | Parameters, maximum, and next-link representation unresolved | Synthetic: yes after contract capture. Live: safe with small page and non-sensitive filters            | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Player: Get                       | `GET /players/{playerId}`             | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/players/{id})                    | Exact token scope, profile visibility, data-sharing and organization permission unresolved                                                            | Path: opaque Player ID. Includes/fields unresolved                                            | Not applicable                                               | Synthetic: yes. Live: only owner-approved non-sensitive fixture; responses can be private              | Proposed `0.1.0`; **not implemented**; privacy contract blocks work                                                                                                    |
| Player: Get Many/Search           | `GET /players`                        | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/players)                         | Exact scope; personal/organization data-sharing visibility unresolved                                                                                 | Search/server/identifier filters, sort, includes and external-identifier semantics unresolved | All fields and maximum unresolved                            | Synthetic: yes after verification. Live: sensitive; dedicated fixture required                         | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Game: Get Many                    | `GET /games`                          | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/games)                           | Exact authentication/subscription requirement unresolved; no organization context expected but not proven                                             | Filters/sort/include unresolved; game identifier is a string, distinct from resource IDs      | All fields and maximum unresolved                            | Synthetic: yes. Live: likely safest collection once subscription access exists                         | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Organization: Get                 | `GET /organizations/{organizationId}` | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/organizations/{id})              | Exact API scope and membership/role permission unresolved; organization context                                                                       | Path: opaque Organization ID; query/includes unresolved                                       | Not applicable                                               | Synthetic: yes. Live: private; dedicated test organization only                                        | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Organization: Get Many            | `GET /organizations`                  | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/organizations)                   | Whether results mean memberships, discovery, or both is unresolved; exact scope unresolved                                                            | Filters/sort/includes unresolved                                                              | All fields and maximum unresolved                            | Synthetic: yes. Live: dedicated account with test organization                                         | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Ban List: Get                     | `GET /ban-lists/{banListId}`          | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/ban-lists/{id})                  | Exact scope and organization role/resource permission unresolved                                                                                      | Path: opaque Ban-list ID; includes unresolved                                                 | Not applicable                                               | Synthetic: yes. Live: disposable empty list only                                                       | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Ban List: Get Many                | `GET /ban-lists`                      | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/ban-lists)                       | Personal versus organization lists and exact permission unresolved                                                                                    | Organization/filter/sort/include fields unresolved                                            | All fields and maximum unresolved                            | Synthetic: yes. Live: dedicated account/org                                                            | Proposed `0.1.0`; **not implemented**                                                                                                                                  |
| Ban: Get                          | `GET /bans/{banId}`                   | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/bans/{id})                       | Exact scope and ban-list/org permission unresolved; moderation-sensitive                                                                              | Path: opaque Ban ID; include semantics unresolved                                             | Not applicable                                               | Synthetic: yes. Live: owner-created synthetic ban only                                                 | Proposed `0.1.0`; **not implemented**; sensitive fields require minimization                                                                                           |
| Ban: Get Many                     | `GET /bans`                           | [official developer docs](https://www.battlemetrics.com/developers/documentation#link-GET-/bans)                            | Exact scope/list/org permission unresolved; moderation-sensitive                                                                                      | Ban-list/player/org/status/date filters, sort, includes unresolved                            | All fields and maximum unresolved                            | Synthetic: yes. Live: disposable list with synthetic records and small limit                           | Proposed `0.1.0`; **not implemented**                                                                                                                                  |

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

The current result proves only that this research environment cannot anonymously read the Server
collection without a subscription. It does not prove that a Bearer token alone is sufficient, that all
resources behave identically, or that historically public data is private. A future live matrix should
test, with BattleMetrics approval and no captured browser state:

1. no Authorization header on a harmless one-item collection request;
2. invalid synthetic Bearer token;
3. valid subscribed least-privilege token;
4. valid token lacking the endpoint's scope;
5. valid token with scope but without resource/organization permission.

Record only status, safe headers, error schema, and a structural success assertion. This distinguishes
401, subscription 403, scope 403, resource 403/404, and success without disclosing response content.

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
happens, only Server Get is presented in the UI and even it carries the documented live-confirmation
limitation.
