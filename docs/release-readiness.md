# Release readiness

## Creator Portal remediation release 0.1.2 (2026-08-11)

The published `0.1.1` source produced 18 findings in
`@n8n/scan-community-package` 0.32.0. After the REST credential-test correction,
the local baseline was 17 findings. The current local source now returns `{ "passed": true }` from the
scanner's exported `analyzePackage()` API using its exact `SOURCE_FILE_PATTERNS`—zero findings.

The exact remediation tarball was also installed in a disposable n8n 2.30.6 profile. Authenticated
editor metadata exposed the intended action operations, REST credential test, renamed webhook
credential, signed trigger webhook, and no Custom API Call. The local webhook credential test returned
honest configured/empty results; signed JSON and text succeeded; invalid signature, malformed signed
JSON, and unsupported media were rejected without executions; activation and deactivation completed
without a remote BattleMetrics lifecycle request. The disposable profile was removed after the check.

Version `0.1.2` packages these scanner-only corrections. It adds the REST API credential test, aligns
the webhook credential with scanner naming and local-test rules, adds lifecycle acknowledgements per
direct n8n staff guidance for manually registered upstream webhooks, and corrects n8n error/test
conventions. No product functionality change is intended.

## Foundation gate

- [x] Official current n8n CLI scaffold inspected
- [x] Fixed API origin and required credential
- [x] Server has two read-only operations; Game has only Get Many; Player has only Get
- [x] Typed validation, JSON:API, pagination, output, transport, and safe errors
- [x] Synthetic tests; no BattleMetrics calls in tests or CI
- [x] Original light/dark icon composition with MIT attribution
- [x] Non-publishing CI
- [ ] Official API documentation gaps resolved
- [x] Read-only REST credential test and webhook local-validation boundary documented in ADR 0004
- [x] Conservative Server Get Many implemented without unverified query parameters
- [x] Opt-in read-only live verifier fails closed and is excluded from CI
- [x] Fully qualified codex metadata and supported categories verified in source, build, and package
- [x] Trigger codex category corrected from built-in-only `Core Nodes` to supported `Development`
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
- [x] Separate signed BattleMetrics Webhook Trigger and webhook-only credential implemented
- [x] Manual-only webhook lifecycle acknowledged locally without external registration requests
- [x] Current beta community-package scanner reports zero local-source findings
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
- [x] Trigger display name clarified as BattleMetrics Webhook Trigger without changing
      `battleMetricsTrigger`
- [x] Stable trigger class, internal name, codex identity, webhook path, and
      example type reference regression tested
- [x] Pre-verification webhook credential rename to `battleMetricsWebhookApi` regression tested
- [x] Complete local release-candidate suite passed on Node.js 22.23.2 and 24.18.0
- [x] n8n 2.30.6 isolated-package and n8n 2.32.6 real-webhook evidence recorded without broadening the
      verified n8n range
- [x] GitHub and npm provenance release process documented
- [x] Safe bug-report and pull-request templates prepared
- [x] GitHub private vulnerability reporting is enabled, with private maintainer email retained as a
      fallback
- [x] Public GitHub repository ownership, canonical `origin`, real CI, security controls, and `main`
      protection established by the owner
- [x] npm package ownership established by the owner through the first authorized publication
- [x] Proven tag-only Trusted Publisher workflow retained without an npm token or GitHub Environment

## Publication blockers

The published `0.1.1` package predates the local Creator Portal fixes documented above. Release `0.1.2`
must be explicitly approved and published through the same Trusted Publisher path proven by `0.1.1`;
Creator Portal resubmission remains later work. Each included operation has
sufficient contract evidence, mocked coverage, safe live verification where applicable, documentation,
and package-content review. Player Search/Get
Many, Organization reads, Ban List/Ban reads and writes, Notes, Flags, moderation operations, RCON
command execution from the action node, polling, websockets, automatic trigger registration, and
arbitrary Custom API Call support are explicitly outside this release and do not block it.
Node.js support is limited to the locally and CI-tested 22 and 24 majors. n8n end-to-end evidence is
limited to 2.30.6 and 2.32.6; other n8n versions remain unverified rather than implicitly supported.

The product scope is frozen. Live Return All is intentionally not an unbounded publication gate; a
bounded two-page live Limit run plus controlled pagination tests provide the safety evidence.

The tag-only workflow uses npm Trusted Publisher identity and contains no npm token, release secret, or
GitHub Environment. It validates and publishes from an immutable tagged checkout with provenance.

Three open Dependabot alerts remain recorded rather than dismissed or overridden: high-severity
transitive `nanoid` alerts #7 and #8, and medium-severity transitive `uuid` alert #4. They arise in the
upstream n8n/build-test lockfile graph. This package does not directly import either library, its packed
artifact contains neither dependency, and its npm manifest declares zero runtime dependencies. Recheck
the upstream toolchain normally, but these findings do not add package-owned runtime code to `0.1.0`.

The required procedure is [the release process](release-process.md).
