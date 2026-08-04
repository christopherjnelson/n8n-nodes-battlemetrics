# Example workflows

Import any JSON file into n8n after installing `n8n-nodes-battlemetrics`.

- `get-games.json` demonstrates Game → Get Many with Return All disabled and Limit 10.
- `get-player.json` demonstrates Player → Get with a synthetic BattleMetrics Player ID.
- `get-server.json` demonstrates Server → Get with a synthetic placeholder ID.
- `get-servers.json` demonstrates Server → Get Many with Return All disabled and Limit 10.

No workflow contains a credential ID, access token, execution output, or real server or player data. Create a
BattleMetrics API credential in n8n, select it on the BattleMetrics node, and replace placeholders where
needed. API access depends on an eligible BattleMetrics subscription. Player output can contain personal
information; minimize retention and forwarding and never post raw responses in issues.
