# Release readiness

## Foundation gate

- [x] Official current n8n CLI scaffold inspected
- [x] Fixed API origin and required credential
- [x] Server has two read-only operations; Game has only Get Many; Player has only Get
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
- [x] Bounded Premium subscribed Game Get Many live test completed on 2026-08-04
- [x] Owner-approved Premium subscribed Player Get and synthetic missing-player tests completed on 2026-08-04
- [x] Exact packed-package workflows verified in a disposable localhost-only n8n 2.30.6 instance
- [x] Exact Phase 1D tarball verified for Game UI, credential selection, Limit 5/11 execution, and example import
- [x] Exact Phase 1E tarball verified for Player UI, credential safety, live Get, two-input pairing, Continue On Fail, and example import
- [x] n8n proxy authentication disabled so no unverified Custom API Call is injected
- [x] Importable synthetic Server Get and Get Many examples included and regression tested
- [x] Importable synthetic Game Get Many example included and regression tested
- [x] Importable synthetic Player Get example included and regression tested
- [x] Player diagnostics retain only structural key names and never enumerate or emit identity values
- [x] Phase 1F Ban List/Ban reads stopped at the permission checkpoint; no moderation request or
      speculative operation was added
- [x] Bounded live Limit matrix covers one page, the observed page boundary, and one safe page follow
- [x] Runtime `NodeApiError.httpCode` classification is regression tested
- [x] Light/dark icons rendered in n8n and inspected at 16, 20, and 24 pixels
- [ ] Explicit `0.1.0` operation set chosen; broader read matrix remains a roadmap
- [ ] Current first-party Ban List/Ban panels, exact read scopes, and organization permissions captured
- [ ] Separate least-privilege moderation token and owner-controlled disposable read targets provided
- [ ] Repository and npm ownership established by the owner
- [ ] Security private-reporting channel configured

## Publication blockers

Do not publish `0.1.0` until each operation actually included in that release has a current first-party
contract record, exact scope/permission mapping, mocked coverage, suitable safe live verification,
documentation, and package-content review. The broader API-scope list is a roadmap, not a requirement to
ship every read in `0.1.0`. Broader supported-version compatibility remains separate from the recorded
Node.js 24.18.0 and n8n 2.30.6 packed-package check.

The Server resource itself may be frozen after Phase 1C validation, but the package must not be called
release-ready while the unchecked ownership, private-reporting, documentation-contract, and compatibility
gates above remain open. Live Return All is intentionally not an unbounded publication gate; a bounded
two-page live Limit run plus controlled pagination tests provide the safety evidence.

This repository intentionally contains no publishing workflow, npm token, release secret, or functional
release script.
