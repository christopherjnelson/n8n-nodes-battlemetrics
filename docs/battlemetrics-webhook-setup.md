# BattleMetrics webhook setup

The BattleMetrics Trigger receives webhooks that you configure manually in BattleMetrics. It never
creates, changes, enables, disables, or deletes a BattleMetrics trigger.

## Configure n8n and BattleMetrics

1. Add **BattleMetrics Trigger** to an n8n workflow.
2. Create a **BattleMetrics Webhook** credential and enter a high-entropy shared secret. This secret is
   separate from the REST access token.
3. While testing, select **Listen for Test Event** and copy the Test URL. For ongoing use, activate the
   workflow and copy the Production URL.
4. In BattleMetrics, create a personal trigger, or an organization trigger if your role has **Use
   Trigger Webhooks**. Select a harmless event and any required conditions.
5. Add a **Webhook** action. Paste the matching n8n URL, enter the same shared secret, choose
   `application/json` or `text/plain`, and paste a body template.
6. Enable the BattleMetrics trigger/webhook. Test URLs work only while n8n is listening; Production URLs
   work only while the workflow is active.
7. Connect the trigger output to Discord, Slack, Telegram, email, or other n8n nodes as needed.

The URL must be publicly reachable by BattleMetrics and must not redirect. This project does not expose a
local port or create a tunnel for you. BattleMetrics cannot reveal the existing shared secret later, but
you can configure a new one if it is lost. Never put the secret in a URL, body, screenshot, execution
sample, or issue report.

BattleMetrics retries failures with backoff and may eventually disable a webhook. Duplicate delivery is
possible. Use `webhook.requestId` for durable downstream deduplication when a repeated non-idempotent
action would be harmful; it is debugging metadata, not authentication.

## JSON templates

These templates use only variables and the `jsonObject` helper shown by BattleMetrics' public Webhooks
and Templates documentation. The static `event` label is intentional: the generic receiver cannot infer
which user-designed BattleMetrics trigger produced a payload. Confirm variable availability in the
condition table shown for the selected trigger before enabling it.

### Server Update

Use with a **Server Update** trigger and content type `application/json`:

```handlebars
{{jsonObject
	event='server.update'
	occurredAt=timestamp.iso8601
	server=(jsonObject
		id=server.id name=server.name players=server.players maxPlayers=server.maxPlayers
	)
}}
```

### Player Join

Use with a **Player Join** trigger and content type `application/json`:

```handlebars
{{jsonObject
	event='player.join'
	occurredAt=timestamp.iso8601
	server=(jsonObject id=server.id name=server.name)
	player=(jsonObject id=player.id name=player.name)
}}
```

The defaults omit IP addresses, moderation notes, flags, and other sensitive profile data.

## Output and responses

Successful requests return HTTP 200 quickly and emit one item:

```json
{
	"body": { "event": "server.update" },
	"webhook": {
		"verified": true,
		"timestamp": "2026-01-01T00:00:00.000Z",
		"requestId": "synthetic-request-id",
		"contentType": "application/json"
	}
}
```

`body` can instead be any JSON value or an exact decoded plain-text string. `requestId` is omitted when
absent. The output never includes the signature, secret, raw-body duplicate, or full request headers.

Status codes are 401 for missing/malformed/invalid signatures, 415 for unsupported content types, 400
for malformed verified JSON or invalid UTF-8, and 500 if exact raw bytes are unavailable. Invalid
requests emit no workflow item.
