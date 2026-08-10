# Changelog

All notable changes to this project will be documented here.

## 0.1.0 - Unreleased

### Added

- Official n8n community-node scaffold foundation.
- BattleMetrics personal-access-token credential.
- Read-only Server Get and conservative Server Get Many operations.
- Read-only Game Get Many with local Return All and Limit controls.
- Read-only Player Get by an exact opaque BattleMetrics Player ID.
- Typed transport, validation, JSON:API, pagination, output, and safe-error foundations.
- Bounded same-origin collection pagination with combined-envelope context preservation.
- Opt-in, read-only, sanitized local live-verification harness.
- Synthetic mocked test suite, original icon composition, documentation, and non-publishing CI.
- Offline regressions for sanitized live-verifier summaries and packed codex metadata.
- Sanitized synthetic fixtures matching the subscribed Server Get and Get Many structures.
- Importable synthetic Server Get and Get Many example workflows.
- An importable synthetic Game Get Many example workflow.
- An importable synthetic Player Get example workflow and privacy-focused diagnostics/tests.
- Packed-artifact regressions for the allowlist, examples, metadata equality, exports, loadability,
  credential UX, runtime dependency count, sizes, and SHA-256.
- A separate BattleMetrics Trigger and password-protected BattleMetrics Webhook credential for manually
  configured outbound webhooks.
- Strict exact-byte HMAC-SHA256 verification, JSON/plain-text parsing after authentication, immediate
  acknowledgement, safe structured output, and fixed failure responses.
- The public BattleMetrics signature known-answer vector plus parser, body, trigger, HTTP, output,
  credential, metadata, and package regressions.
- An importable generic webhook receiver, conservative Started Map, Server Action, and Player Join JSON
  templates, a raw-body ADR, and a manual RCON / Triggers setup guide.

### Changed

- Froze the proposed `0.1.0` surface to Server Get/Get Many, Game Get Many, Player Get, and the signed
  generic webhook receiver; explicitly deferred broader reads, moderation, polling, websockets,
  automatic trigger registration, and arbitrary/custom API calls.
- Recorded real BattleMetrics-originated signed delivery for a manually invoked Server Action and two
  automatic Started Map events, including HTTP 200, verified safe metadata/body output, and absence of
  secret, signature, raw-body, Authorization, cookie, or full-header leakage.
- Corrected webhook setup to the native RCON / Triggers product and documented the practical need for an
  owner-controlled, BattleMetrics RCON-connected server plus relevant organization permissions.
- Made Started Map the preferred deterministic automatic example, retained Server Action as the manual
  connectivity test, warned that Server Update can be extremely noisy, and stated explicitly that the
  n8n trigger does not poll.
- Audited the `BattleMetrics Trigger` display name and recorded a pre-publication recommendation for a
  future display-name-only change while preserving `battleMetricsTrigger`.
- Recorded the Phase 1F Ban List/Ban permission checkpoint and deferred all moderation reads because
  the current first-party contract, exact permissions, least-privilege token, and authorized targets
  were unavailable; no moderation request or operation was added.
- Removed the always-failing credential-test button; credentials are validated when operations run.
- Classified invalid-token, subscription, permission, rate-limit, transport, and malformed-response
  failures without exposing credentials.
- Hardened the read-only live verifier for Server Get, bounded Server Get Many pagination, synthetic
  negative checks, safe header reporting, structural validation, and fail-closed results.
- Extended the live verifier with bounded Game collection and one-next-page structural checks.
- Extended the live verifier with owner-approved Player Get and a synthetic missing-player check while
  suppressing every player ID and field value.
- Corrected codex metadata to the fully qualified `n8n-nodes-battlemetrics.battleMetrics` identity.
- Verified Premium subscribed Server reads, absolute keyset pagination, invalid credentials, and missing
  resources against the live API without retaining response values.
- Verified Premium subscribed Player Get and missing-player behavior without searching, enumerating, or
  retaining player identity data.
- Renamed the `404` error category to `resourceNotFound` to match the verified contract.
- Clarified Server IDs, raw envelopes, default collection ordering, the absence of server-side filters,
  local Limit behavior, Return All caps, and subscription requirements in the node UI.
- Recognized n8n `NodeApiError.httpCode` strings so runtime 401/403/404/429/5xx failures retain their
  safe category and status.
- Moved Bearer attachment into the shared transport to prevent n8n 2.30.6 from injecting an unverified
  Custom API Call while preserving credential-backed authentication.
