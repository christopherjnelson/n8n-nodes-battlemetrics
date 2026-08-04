# ADR 0002: Read-first `0.1.0` scope

- Status: Accepted recommendation; Server Get/Get Many, Game Get Many, and Player Get are currently
  implemented
- Date: 2026-08-02

## Recommended exact `0.1.0` operations

1. Server: Get
2. Server: Get Many (search/filter controls deferred pending first-party verification)
3. Player: Get — implemented after subscribed get-by-ID verification
4. Player: Get Many/Search — deferred; collection constraints and privacy contract unresolved
5. Game: Get Many (implemented without unverified query parameters)
6. Organization: Get
7. Organization: Get Many
8. Ban List: Get
9. Ban List: Get Many
10. Ban: Get
11. Ban: Get Many

This is Candidate A, read-first. Game Get Many was promoted after bounded subscribed verification of
`GET /games`; no other Game operation was added. Player Get was promoted after owner-approved bounded
verification of `GET /players/{playerId}` and synthetic missing-player behavior. Player search and
collection access remain deferred to prevent broad enumeration or private-identifier search. Each deferred operation remains contingent on
verification of the current official method, path, filters, sorting, includes, pagination, media type,
exact token scope, organization permission, and response schema. Proposed scope is not an implementation
claim.

Phase 1F reviewed Ban List Get/Get Many and Ban Get/Get Many and promoted none. The current first-party
developer panels could not be accessed, the configured development token has no optional moderation
permissions, and no owner-controlled Ban List ID or existing safe Ban ID was configured. Candidate paths
remain inferred rather than implementation-grade contract evidence. Broadening the existing reused token,
probing a broad Ban collection, or creating a test ban would violate the phase's permission and read-only
constraints. These four reads remain deferred until a separate least-privilege token, exact first-party
scope and organization-permission names, and owner-controlled targets are available.

## Deferred

Ban create/update/delete, player-identifier reads, notes, flags, activity/audit, triggers, outbound
webhooks, websocket behavior, and a trigger node are deferred. Ban writes and player notes can expose
reasons, evidence, internal comments, and personal identifiers. Flags and audit logs reveal moderation
decisions and staff activity. These are poor autonomous AI-tool actions without narrow permissions,
deterministic inputs, preview/idempotency rules, auditability, and human approval.

Ban writes are not recommended for `0.1.0`. The official request bodies, conflict semantics, exact
organization permissions, deletion meaning, and disposable cleanup strategy were not sufficiently
verifiable in this pass.

## Future live-test requirements

The owner must later provide a dedicated subscribed BattleMetrics account, a separate least-privilege
token, a synthetic/non-production organization, a disposable server and player fixture where permitted,
an owner-controlled empty disposable ban list, an existing synthetic ban for read verification, and
explicit approval for each future write test. Private values must stay outside Git and normal CI. No ban
may be created merely to unblock a read-only phase.
