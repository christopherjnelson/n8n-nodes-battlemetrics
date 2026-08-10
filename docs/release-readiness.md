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
- [x] Separate signed BattleMetrics Trigger and webhook-only credential implemented
- [x] Exact raw-body HMAC known-answer and mutation regressions implemented
- [x] Manual registration, retry/deduplication limits, safe templates, and output documented
- [x] Exact Phase 2A tarball verified through Test and activated Production endpoints in disposable n8n
- [x] Real BattleMetrics Server Action delivered one signed HTTP 200 Production webhook with safe output
- [x] Real BattleMetrics Started Map delivered one signed HTTP 200 webhook for each of two deliberate
      map changes without n8n polling or manual BattleMetrics action
- [x] RCON / Triggers setup, controlled RCON-connected server requirement, relevant organization roles,
      and manual Webhook action documented
- [x] Started Map is the preferred deterministic automatic example; Server Action is the manual
      connectivity test; noisy Server Update behavior is warned against
- [x] Player diagnostics retain only structural key names and never enumerate or emit identity values
- [x] Phase 1F Ban List/Ban reads stopped at the permission checkpoint; no moderation request or
      speculative operation was added
- [x] Bounded live Limit matrix covers one page, the observed page boundary, and one safe page follow
- [x] Runtime `NodeApiError.httpCode` classification is regression tested
- [x] Light/dark icons rendered in n8n and inspected at 16, 20, and 24 pixels
- [x] Explicit `0.1.0` functionality frozen; broader REST resources and all other triggers remain deferred
- [x] Trigger display-name tradeoff recorded without changing `battleMetricsTrigger`
- [ ] Repository and npm ownership established by the owner
- [ ] Security private-reporting channel configured

## Publication blockers

Do not publish `0.1.0` until each included operation has sufficient contract evidence, mocked coverage,
safe live verification where applicable, documentation, and package-content review. Player Search,
Organizations, Ban List/Ban operations, moderation writes, polling, websockets, automatic trigger
registration, and arbitrary/custom API calls are explicitly outside this release and do not block it.
Broader supported-version compatibility remains separate from the recorded Node.js 24.18.0 and n8n
2.30.6 packed-package check.

The product scope is frozen, but the package must not be called release-ready while the unchecked
ownership, private-reporting, documentation-contract, and compatibility gates above remain open. Live Return All is intentionally not an unbounded publication gate; a bounded
two-page live Limit run plus controlled pagination tests provide the safety evidence.

This repository intentionally contains no publishing workflow, npm token, release secret, or functional
release script.
