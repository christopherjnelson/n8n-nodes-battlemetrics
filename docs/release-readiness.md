# Release readiness

## Foundation gate

- [x] Official current n8n CLI scaffold inspected
- [x] Fixed API origin and required credential
- [x] One read-only operation only
- [x] Typed validation, JSON:API, pagination, output, transport, and safe errors
- [x] Synthetic tests; no BattleMetrics calls in tests or CI
- [x] Original light/dark icon composition with MIT attribution
- [x] Non-publishing CI
- [ ] Official API documentation gaps resolved
- [ ] Credential validity endpoint verified or limitation accepted for release
- [ ] Owner-provided subscribed live test completed
- [ ] Proposed read matrix implemented and tested
- [ ] Repository and npm ownership established by the owner
- [ ] Security private-reporting channel configured

## Publication blockers

Do not publish `0.1.0` until each proposed operation has a current first-party contract record, exact
scope/permission mapping, mocked coverage, safe live verification, documentation, and package-content
review. Confirm n8n compatibility on supported Node/n8n versions and manually inspect both icon variants
in light/dark themes at 16, 20, and 24 pixels.

This repository intentionally contains no publishing workflow, npm token, release secret, or functional
release script.
