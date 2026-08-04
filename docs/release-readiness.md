# Release readiness

## Foundation gate

- [x] Official current n8n CLI scaffold inspected
- [x] Fixed API origin and required credential
- [x] Only the Server resource, with two read-only operations
- [x] Typed validation, JSON:API, pagination, output, transport, and safe errors
- [x] Synthetic tests; no BattleMetrics calls in tests or CI
- [x] Original light/dark icon composition with MIT attribution
- [x] Non-publishing CI
- [ ] Official API documentation gaps resolved
- [x] Credential prevalidation limitation accepted and documented in ADR 0004
- [x] Conservative Server Get Many implemented without unverified query parameters
- [x] Opt-in read-only live verifier fails closed and is excluded from CI
- [x] Fully qualified codex metadata and supported categories verified in source, build, and package
- [x] Temporary package regression gate verifies metadata, package contents, and compiled exports
- [x] Owner-provided Premium subscribed Server live test completed on 2026-08-04
- [ ] Manual packed-package workflows verified in a disposable local n8n instance
- [ ] Explicit `0.1.0` operation set chosen; broader read matrix remains a roadmap
- [ ] Repository and npm ownership established by the owner
- [ ] Security private-reporting channel configured

## Publication blockers

Do not publish `0.1.0` until each operation actually included in that release has a current first-party
contract record, exact scope/permission mapping, mocked coverage, suitable safe live verification,
documentation, and package-content review. The broader API-scope list is a roadmap, not a requirement to
ship every read in `0.1.0`. Confirm n8n compatibility on supported Node/n8n versions and manually inspect
both icon variants in light/dark themes at 16, 20, and 24 pixels.

This repository intentionally contains no publishing workflow, npm token, release secret, or functional
release script.
