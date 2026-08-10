# ADR 0002: Read-first `0.1.0` scope

- Status: Accepted and frozen for proposed `0.1.0`
- Date: 2026-08-02

## Frozen `0.1.0` functionality

1. Server: Get
2. Server: Get Many (search/filter controls deferred pending first-party verification)
3. Game: Get Many (implemented without unverified query parameters)
4. Player: Get — implemented after subscribed get-by-ID verification
5. Signed generic BattleMetrics webhook receiver under ADR 0006, accepting `application/json` and
   `text/plain`, verifying HMAC-SHA256 over the exact raw body, acknowledging immediately after
   authentication/parsing, and emitting safe webhook metadata

This is the complete proposed `0.1.0` product boundary, not an incremental candidate list. Game Get Many
was promoted after bounded subscribed verification of `GET /games`; no other Game operation was added.
Player Get was promoted after owner-approved bounded verification of `GET /players/{playerId}` and
synthetic missing-player behavior. Player search and collection access remain deferred to prevent broad
enumeration or private-identifier search. Each deferred operation remains contingent on verification of
the current official method, path, filters, sorting, includes, pagination, media type, exact token scope,
organization permission, and response schema.

Phase 1F reviewed Ban List Get/Get Many and Ban Get/Get Many and promoted none. The current first-party
developer panels could not be accessed, the configured development token has no optional moderation
permissions, and no owner-controlled Ban List ID or existing safe Ban ID was configured. Candidate paths
remain inferred rather than implementation-grade contract evidence. Broadening the existing reused token,
probing a broad Ban collection, or creating a test ban would violate the phase's permission and read-only
constraints. These four reads remain deferred until a separate least-privilege token, exact first-party
scope and organization-permission names, and owner-controlled targets are available.

## Deferred

Player Get Many/Search, Organizations, all Ban List/Ban reads and writes, moderation writes,
player-identifier reads, notes, flags, activity/audit, arbitrary/custom API calls, automatic webhook
registration, polling triggers, and websocket behavior are deferred. Phase 2A separately implements a
manual outbound-webhook receiver under [ADR 0006](0006-signed-webhook-trigger.md); it adds no REST
resource or BattleMetrics-side lifecycle call. It is configured manually in BattleMetrics RCON /
Triggers and receives pushed Webhook actions; n8n performs no polling. Ban writes and player notes can
expose reasons, evidence, internal comments, and personal identifiers. Flags and audit logs reveal
moderation decisions and staff activity. These are poor autonomous AI-tool actions without narrow
permissions, deterministic inputs, preview/idempotency rules, auditability, and human approval.

Ban writes are not recommended for `0.1.0`. The official request bodies, conflict semantics, exact
organization permissions, deletion meaning, and disposable cleanup strategy were not sufficiently
verifiable in this pass.

## Future post-0.1.0 live-test requirements

The owner must later provide a dedicated subscribed BattleMetrics account, a separate least-privilege
token, a synthetic/non-production organization, a disposable server and player fixture where permitted,
an owner-controlled empty disposable ban list, an existing synthetic ban for read verification, and
explicit approval for each future write test. Private values must stay outside Git and normal CI. No ban
may be created merely to unblock a read-only phase.
