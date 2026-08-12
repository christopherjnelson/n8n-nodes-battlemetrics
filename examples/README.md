# Example workflows

Import any JSON file into n8n after installing `n8n-nodes-battlemetrics`.

- `get-games.json` demonstrates Game → Get Many with Return All disabled and Limit 10.
- `get-player.json` demonstrates Player → Get with a synthetic BattleMetrics Player ID.
- `get-server.json` demonstrates Server → Get with a synthetic placeholder ID.
- `get-servers.json` demonstrates Server → Get Many with Return All disabled and Limit 10.
- `receive-battlemetrics-webhook.json` demonstrates the manually configured signed BattleMetrics Webhook Trigger,
  using Started Map as the preferred automatic example and Server Action as the manual connectivity test.

No workflow contains a credential ID, access token, execution output, or real server or player data. Create a
BattleMetrics API credential in n8n, select it on the BattleMetrics node, and replace placeholders where
needed. API access depends on an eligible BattleMetrics subscription. Player output can contain personal
information; minimize retention and forwarding and never post raw responses in issues.

The webhook example contains no shared secret, credential ID, real payload, or downstream delivery
credential. Create a separate BattleMetrics Webhook API credential, then follow the
[manual setup guide](../docs/battlemetrics-webhook-setup.md). Test URLs require n8n to be listening;
Production URLs require an active workflow. Native setup is performed in BattleMetrics RCON / Triggers
against an owner-controlled, RCON-connected server. The n8n trigger does not poll or register the
upstream trigger. Connect its output to Discord, Slack, Telegram, Email, or another destination only
after adding that service's credential locally; exported examples must not contain destination
credentials. A service-neutral Edit Fields step can first map the verified event into a small `text`
and `verified` object. Server Update can be extremely noisy without filtering.
