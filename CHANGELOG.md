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

### Changed

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
