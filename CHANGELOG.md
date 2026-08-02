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

### Changed

- Removed the always-failing credential-test button; credentials are validated when operations run.
- Classified invalid-token, subscription, permission, rate-limit, transport, and malformed-response
  failures without exposing credentials.
