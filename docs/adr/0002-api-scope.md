# ADR 0002: Read-first `0.1.0` scope

- Status: Accepted recommendation; Server Get and conservative Get Many are currently implemented
- Date: 2026-08-02

## Recommended exact `0.1.0` operations

1. Server: Get
2. Server: Get Many (search/filter controls deferred pending first-party verification)
3. Player: Get
4. Player: Get Many/Search
5. Game: Get Many
6. Organization: Get
7. Organization: Get Many
8. Ban List: Get
9. Ban List: Get Many
10. Ban: Get
11. Ban: Get Many

This is Candidate A, read-first. Each deferred operation remains contingent on verification of the
current official method, path, filters, sorting, includes, pagination, media type, exact token scope,
organization permission, and response schema. Proposed scope is not an implementation claim.

## Deferred

Ban create/update/delete, player-identifier reads, notes, flags, activity/audit, triggers, outbound
webhooks, websocket behavior, and a trigger node are deferred. Ban writes and player notes can expose
reasons, evidence, internal comments, and personal identifiers. Flags and audit logs reveal moderation
decisions and staff activity. These are poor autonomous AI-tool actions without narrow permissions,
deterministic inputs, preview/idempotency rules, auditability, and human approval.

Ban CRUD is not recommended for `0.1.0`. The official request bodies, conflict semantics, exact
organization permissions, deletion meaning, and disposable cleanup strategy were not sufficiently
verifiable in this pass.

## Future live-test requirements

The owner must later provide a dedicated subscribed BattleMetrics account, a least-privilege disposable
token, a synthetic/non-production organization, a disposable server and player fixture where permitted,
an empty disposable ban list, a synthetic ban that may be safely removed, and explicit approval for each
write test. Private values must stay outside Git and normal CI.
