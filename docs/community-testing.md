# Community testing

Normal tests and CI are fully synthetic and must never contact BattleMetrics.

The repository provides `pnpm run verify:live`. It fails closed unless both
`BATTLEMETRICS_ACCESS_TOKEN` and `BATTLEMETRICS_SERVER_ID` are non-empty. It performs only bounded,
read-only Server Get and Server Get Many requests, follows at most one validated next link, and performs
one synthetic invalid-token check plus one synthetic missing-server check. It summarizes status,
content type, structural key names, pagination form and target validity, safe numeric/rate/cache
headers, timing, and normalized categories. It does not log authorization headers, token values,
resource IDs, response bodies, full URLs, or resource values and is not run by normal tests or CI.

With an ignored, untracked, mode-`600` repository-local `.env`, run:

```sh
node --env-file=.env scripts/live-verify.mjs
```

Never print or inspect `.env` contents, redirect verifier output to a tracked path, or pass a token as a
process argument. Use a subscribed test account, a least-privilege token, and an owner-approved server
ID. Never extend the harness to writes without a separate approved phase.

The Premium subscribed verifier passed on 2026-08-04. The sanitized result established successful
Server Get and Server Get Many, one absolute same-origin keyset page follow, `401 invalidCredential`,
and `404 resourceNotFound`. Successful responses used `application/json` with JSON:API-shaped `data`,
`included`, and collection `links`; no raw body or live value was retained. Repeat only when a release
change affects transport, validation, pagination, output, or error normalization.

Phase 1C subsequently installed one exact tarball into a disposable n8n profile and exercised the real
n8n 2.30.6 editor on localhost with Node.js 24.18.0. The browser discovered BattleMetrics, displayed its
two actions, showed a password-protected BattleMetrics API credential without a test button, and ran
Server Get plus bounded Get Many limits 1, 5, 10, and 11. The observed collection page contained 10
primary resources, so Limit 11 followed exactly one safe next link. Stored execution checks confirmed
string IDs, raw envelope preservation, ordering, local trimming, page context, pairing, and absence of
credential or Authorization data. A disposable two-input workflow also confirmed stable success/error
ordering and continue-on-fail behavior.

Do not run live Return All merely to prove pagination: the collection can be large. The live Limit 11
check is the bounded two-page proof; Return All termination, caps, ordering, included deduplication, and
unsafe-link handling remain covered with controlled mocked responses.

Before filtered collection reads, verify every query field in current first-party documentation and use
synthetic search criteria and small limits. Before any moderation test,
provide a disposable organization and ban list, a synthetic player/identifier permitted for testing, an
explicit cleanup plan, and human approval. Writes must run serially and verify both the intended mutation
and cleanup. Do not use production organizations, real ban reasons, player notes, flags, or private
identifiers.

Record the BattleMetrics plan/subscription, token scopes, organization role permissions, test timestamp,
and API response headers without secret values. Disable and revoke the token after testing.
