# Changelog

All notable changes to this project will be documented here.

## 0.1.0 - Unreleased

### Added

- Official n8n community-node scaffold foundation.
- BattleMetrics personal-access-token credential.
- Read-only Server Get and conservative Server Get Many operations.
- Typed transport, validation, JSON:API, pagination, output, and safe-error foundations.
- Bounded same-origin collection pagination with combined-envelope context preservation.
- Opt-in, read-only, sanitized local live-verification harness.
- Synthetic mocked test suite, original icon composition, documentation, and non-publishing CI.
- Offline regressions for sanitized live-verifier summaries and packed codex metadata.
- Sanitized synthetic fixtures matching the subscribed Server Get and Get Many structures.
- Importable synthetic Server Get and Get Many example workflows.
- Packed-artifact regressions for the allowlist, examples, metadata equality, exports, loadability,
  credential UX, runtime dependency count, sizes, and SHA-256.

### Changed

- Removed the always-failing credential-test button; credentials are validated when operations run.
- Classified invalid-token, subscription, permission, rate-limit, transport, and malformed-response
  failures without exposing credentials.
- Hardened the read-only live verifier for Server Get, bounded Server Get Many pagination, synthetic
  negative checks, safe header reporting, structural validation, and fail-closed results.
- Corrected codex metadata to the fully qualified `n8n-nodes-battlemetrics.battleMetrics` identity.
- Verified Premium subscribed Server reads, absolute keyset pagination, invalid credentials, and missing
  resources against the live API without retaining response values.
- Renamed the `404` error category to `resourceNotFound` to match the verified contract.
- Clarified Server IDs, raw envelopes, default collection ordering, the absence of server-side filters,
  local Limit behavior, Return All caps, and subscription requirements in the node UI.
- Recognized n8n `NodeApiError.httpCode` strings so runtime 401/403/404/429/5xx failures retain their
  safe category and status.
