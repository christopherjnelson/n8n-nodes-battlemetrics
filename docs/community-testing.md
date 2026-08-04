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

No repository-established interactive n8n test environment was available during that run. Package
regression verified that the compiled node and credential load from the packed artifact, but credential
selection, browser execution data, and manual Server Get/Get Many workflows remain release-hardening
checks in a disposable local n8n instance.

Before filtered collection reads, verify every query field in current first-party documentation and use
synthetic search criteria and small limits. Before any moderation test,
provide a disposable organization and ban list, a synthetic player/identifier permitted for testing, an
explicit cleanup plan, and human approval. Writes must run serially and verify both the intended mutation
and cleanup. Do not use production organizations, real ban reasons, player notes, flags, or private
identifiers.

Record the BattleMetrics plan/subscription, token scopes, organization role permissions, test timestamp,
and API response headers without secret values. Disable and revoke the token after testing.
