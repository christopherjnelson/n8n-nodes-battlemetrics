# Example workflows

Import either JSON file into n8n after installing `n8n-nodes-battlemetrics`.

- `get-server.json` demonstrates Server → Get with a synthetic placeholder ID.
- `get-servers.json` demonstrates Server → Get Many with Return All disabled and Limit 10.

Neither workflow contains a credential ID, access token, execution output, or real server data. Create a
BattleMetrics API credential in n8n, select it on the BattleMetrics node, and replace placeholders where
needed. API access depends on an eligible BattleMetrics subscription.
