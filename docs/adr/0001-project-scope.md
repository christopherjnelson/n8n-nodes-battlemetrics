# ADR 0001: Foundation-only programmatic action node

- Status: Accepted
- Date: 2026-08-02

## Decision

Build one version-1 programmatic action node with standard Main input/output, required
`battleMetricsApi` credentials, and `usableAsTool: true`. Implement only Server Get in this pass. Create
reusable, typed foundations for later reads and writes without presenting unimplemented operations in
the n8n UI.

Use n8n's built-in authenticated HTTP helper and zero runtime dependencies. Fix the origin to
`https://api.battlemetrics.com`. Do not add a trigger node, websocket client, arbitrary-request escape
hatch, moderation writes, publication automation, or functional release command.

## Rationale

Pagination, JSON:API preservation, per-item execution, and safety checks benefit from programmatic
control. The official developer documentation could not be fetched by the research environment and
anonymous REST access now requires a subscription, so breadth would create unsupported claims. One
small read proves the architecture while retaining a reviewable risk surface.

## Consequences

Users get a useful but intentionally narrow node. A later phase must re-verify every endpoint and
permission before adding it. The package cannot publish through CI or an npm script in its current form.
