# ADR 0007: Clarify webhook trigger identity and community category

- Status: Accepted
- Date: 2026-08-10
- Official n8n guidance reviewed: 2026-08-10

## Context

Real BattleMetrics-originated testing confirmed that the n8n node receives signed Webhook actions from
BattleMetrics native triggers. It does not itself create the upstream trigger. The original display name
`BattleMetrics Trigger` could therefore imply broader lifecycle behavior than the node implements.

The trigger codex metadata used `Core Nodes` and `Development`. Current official n8n codex guidance for
custom/community nodes lists these supported categories: Data & Storage, Finance & Accounting,
Marketing & Content, Productivity, Miscellaneous, Sales, Development, Analytics, Communication, and
Utility. `Core Nodes` is absent. n8n's own source uses `Core Nodes` for built-in
`n8n-nodes-base.n8nTrigger`, including built-in subcategories. Syntactic acceptance by a validator does
not make that built-in classification appropriate for a third-party package.

Sources:

- [Official n8n codex-file reference](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/)
- [Official n8n built-in N8n Trigger codex](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/N8nTrigger/N8nTrigger.node.json)
- [Official n8n community-node starter](https://github.com/n8n-io/n8n-nodes-starter)

## Decision

Change only the user-facing display/default name to `BattleMetrics Webhook Trigger`. Preserve:

- class name `BattleMetricsTrigger`;
- internal node name `battleMetricsTrigger`;
- codex identity `n8n-nodes-battlemetrics.battleMetricsTrigger`;
- credential identities;
- webhook registration path and behavior; and
- existing workflow type references and compatibility.

Change the trigger codex categories from `Core Nodes`, `Development` to `Development` only. This is the
smallest semantically suitable correction using the current official community-node category list.
`Developer Tools` remains prohibited because it is not a supported category value.

## Consequences

- The n8n editor and canvas make the receiver role explicit without changing serialized workflow type
  identity.
- Existing workflows continue resolving the same internal node type and version.
- Source, compiled, and packed codex metadata must remain semantically identical.
- Regression tests must pin the display name, internal name, codex identity, supported category, and
  example type reference independently.

## 2026-08-11 scanner amendment

The node identity remains unchanged. Before Creator Portal verification and with no recorded installs,
the webhook credential was renamed from `battleMetricsWebhook` / **BattleMetrics Webhook** to
`battleMetricsWebhookApi` / **BattleMetrics Webhook API** to satisfy current credential naming rules.
This narrow credential-reference correction does not change the trigger's serialized node type, codex
identity, webhook path, or signature behavior.
