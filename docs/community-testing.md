# Community testing

Normal tests and CI are fully synthetic and must never contact BattleMetrics.

The repository provides `pnpm run verify:live`. It fails closed unless
`BATTLEMETRICS_ACCESS_TOKEN` is set, performs only read-only `GET /servers`, and summarizes sanitized
status, content type, envelope shape, pagination form, and relevant rate-limit headers. It does not log
authorization headers, token values, resource IDs, or response bodies and is not run by normal tests or
CI.

Enter the token without putting its value in shell history:

```sh
read -rsp "BattleMetrics access token: " BATTLEMETRICS_ACCESS_TOKEN
echo
export BATTLEMETRICS_ACCESS_TOKEN
pnpm run verify:live
unset BATTLEMETRICS_ACCESS_TOKEN
```

Use a subscribed test account and least-privilege token stored outside the repository. If later live
work needs Server Get, require `BATTLEMETRICS_SERVER_ID` and an owner-approved, non-sensitive server ID.
Never extend the harness to writes without a separate approved phase.

Before filtered collection reads, verify every query field in current first-party documentation and use
synthetic search criteria and small limits. Before any moderation test,
provide a disposable organization and ban list, a synthetic player/identifier permitted for testing, an
explicit cleanup plan, and human approval. Writes must run serially and verify both the intended mutation
and cleanup. Do not use production organizations, real ban reasons, player notes, flags, or private
identifiers.

Record the BattleMetrics plan/subscription, token scopes, organization role permissions, test timestamp,
and API response headers without secret values. Disable and revoke the token after testing.
