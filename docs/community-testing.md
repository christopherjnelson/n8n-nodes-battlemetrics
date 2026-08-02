# Community testing

Normal tests and CI are fully synthetic and must never contact BattleMetrics.

When a live test phase is approved, use a separate opt-in command that fails closed unless all dedicated
environment variables are present. Use a subscribed test account and least-privilege token stored outside
the repository. Begin with read-only Server Get against an owner-approved, non-sensitive server ID. Log
only status, request ID, schema assertions, and timings—never authorization headers or response bodies.

Before collection reads, provide synthetic search criteria and small limits. Before any moderation test,
provide a disposable organization and ban list, a synthetic player/identifier permitted for testing, an
explicit cleanup plan, and human approval. Writes must run serially and verify both the intended mutation
and cleanup. Do not use production organizations, real ban reasons, player notes, flags, or private
identifiers.

Record the BattleMetrics plan/subscription, token scopes, organization role permissions, test timestamp,
and API response headers without secret values. Disable and revoke the token after testing.
