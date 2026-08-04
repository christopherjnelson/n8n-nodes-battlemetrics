# Security policy

## Reporting

Do not open a public issue for a vulnerability or credential exposure. Until the proposed GitHub
repository exists and a private vulnerability-reporting channel is configured, contact the maintainer
through the private contact method on the maintainer's GitHub profile. If no private method is available,
report only that private contact is needed; do not include exploit details or secrets publicly.

Never send BattleMetrics tokens, cookies, private API responses, organization information, player
identifiers, IP-derived data, notes, flags, or ban reasons. Revoke any exposed token immediately in the
BattleMetrics developer area and rotate the affected n8n credential.

Treat a BattleMetrics webhook shared secret like a password. Never put it in a node parameter, URL,
request body, screenshot, issue, workflow export, or execution sample. If exposed or lost, configure a
new secret in both BattleMetrics and the n8n **BattleMetrics Webhook** credential; BattleMetrics cannot
retrieve the old value.

## Supported versions

No production release exists. The unreleased `0.1.0` foundation receives best-effort security fixes.

## Design boundaries

The transport fixes the origin to `https://api.battlemetrics.com`, stores authentication only in n8n
credentials, redacts sensitive errors, encodes path segments, enforces finite timeouts, and validates
pagination links. Tests use synthetic data and make no live requests.

The webhook trigger fails closed unless n8n provides an exact raw-body `Buffer`. It authenticates
`timestamp + "." + raw bytes` with HMAC-SHA256 and constant-time digest comparison before parsing JSON
or UTF-8 text. It emits neither the signature nor full headers. Timestamp authentication does not ensure
exactly-once delivery; workflows with non-idempotent effects need durable downstream deduplication.
