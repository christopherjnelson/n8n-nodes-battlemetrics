# BattleMetrics webhook setup

The BattleMetrics Webhook Trigger receives webhooks that you configure manually in BattleMetrics. It never
creates, changes, enables, disables, or deletes a BattleMetrics trigger, and it does not poll
BattleMetrics. BattleMetrics evaluates its native trigger and sends the Webhook action to n8n.

The native configuration used for the real verification lives in BattleMetrics' **RCON / Triggers**
product. In practical testing, the server had to be controlled by the user and connected to
BattleMetrics RCON. An arbitrary public BattleMetrics server ID was not sufficient. Organization roles
may separately expose **Manage Triggers**, **View Triggers & Exemptions**, **Manage Trigger
Exemptions**, **Trigger Log**, and **Use Trigger Webhooks**; the exact access available depends on the
organization role.

## Configure n8n and BattleMetrics

1. Add **BattleMetrics Webhook Trigger** to an n8n workflow.
2. Create a **BattleMetrics Webhook API** credential and enter a high-entropy shared secret. This secret is
   separate from the REST access token.
3. While testing, select **Listen for Test Event** and copy the Test URL. For ongoing use, activate the
   workflow and copy the Production URL.
4. In BattleMetrics **RCON / Triggers**, select an owner-controlled, RCON-connected server and create a
   trigger. For an organization trigger, ensure the role can manage the trigger and use webhook actions.
   Select a harmless event and any required conditions.
5. Add a **Webhook** action. Paste the matching n8n URL, enter the same shared secret, choose
   `application/json` or `text/plain`, and paste a body template.
6. Enable the BattleMetrics trigger/webhook. Test URLs work only while n8n is listening; Production URLs
   work only while the workflow is active.
7. Connect the trigger output to Discord, Slack, Telegram, email, or another n8n destination as needed.

The credential test confirms only that a non-empty shared secret is configured in n8n. BattleMetrics
verifies the matching secret only when it sends a signed webhook. Likewise, activation and deactivation
are acknowledged locally because BattleMetrics has no API for webhook lifecycle management; no remote
Webhook action is created, discovered, or deleted by n8n.

The notification flow is:

```text
BattleMetrics native trigger
  -> BattleMetrics Webhook Trigger
  -> Discord / Slack / Telegram / Email / other n8n destination
```

No third-party destination credential belongs in the BattleMetrics payload or an exported example.

For a service-neutral notification, add an n8n **Edit Fields** node after the trigger and prepare a
small object such as:

```json
{
	"text": "BattleMetrics event: server.startedMap",
	"verified": true
}
```

Map `text` from only the body fields your own template guarantees, and map `verified` from
`webhook.verified`. Then connect that object to any destination node. Keep Discord, Slack, Telegram,
email, or other destination credentials in n8n; do not embed them in the payload or exported workflow.

The URL must be publicly reachable by BattleMetrics and must not redirect. This project does not expose a
local port or create a tunnel for you. BattleMetrics cannot reveal the existing shared secret later, but
you can configure a new one if it is lost. Never put the secret in a URL, body, screenshot, execution
sample, or issue report.

BattleMetrics retries failures with backoff and may eventually disable a webhook. Duplicate delivery is
possible. Use `webhook.requestId` for durable downstream deduplication when a repeated non-idempotent
action would be harmful; it is debugging metadata, not authentication.

## Recommended verification events

Use **Server Action** for a deterministic manual connectivity test. It lets an authorized operator
deliberately invoke the native RCON trigger and confirm one signed HTTP 200 delivery before enabling
automatic notifications.

Use a game-specific **Started Map** trigger as the primary deterministic automatic example when the
connected game exposes it. In the real Insurgency 2014 verification, each of two deliberate map changes
produced one successful webhook without n8n polling or a manual BattleMetrics action.

**Server Update** is available as a universal/native event, but it was extremely noisy in live testing
because BattleMetrics evaluated it on frequent server updates. Do not use it as the default generic
notification example without narrow conditions. Other observed universal events included Player Join,
Player Update, and Player Leave; available game-specific events depend on the game.
Do not assume that every BattleMetrics plan or every game exposes the same trigger types.

## JSON templates

These templates use only variables and the `jsonObject` helper shown by BattleMetrics' public Webhooks
and Templates documentation. The static `event` label is intentional: the generic receiver cannot infer
which user-designed BattleMetrics trigger produced a payload. Confirm variable availability in the
condition table shown for the selected trigger before enabling it.

### Started Map (preferred automatic example)

Use with a game-specific **Started Map** trigger and content type `application/json`. This conservative
template avoids assuming a game-specific map variable; add one only if the selected trigger's condition
table documents it:

```handlebars
{{jsonObject
	event='server.startedMap'
	occurredAt=timestamp.iso8601
	server=(jsonObject id=server.id name=server.name)
}}
```

### Server Action (manual connectivity test)

Use with a **Server Action** trigger and content type `application/json`:

```handlebars
{{jsonObject
	event='server.action'
	occurredAt=timestamp.iso8601
	server=(jsonObject id=server.id name=server.name)
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
	"body": { "event": "server.startedMap" },
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

## Verification status

Offline tests cover the public signature vector, exact-byte mutations, supported media types, fixed
responses, and redacted output. Separate synthetic HTTP testing verified the exact packed node through
real n8n Test and Production URLs.

Phase 2B additionally verified real BattleMetrics-originated delivery through the Production URL:

- A manually invoked native **Server Action** Webhook action returned HTTP 200 and created exactly one
  verified execution.
- Two deliberate **Started Map** events on an RCON-connected Insurgency 2014 server each produced one
  automatic HTTP 200 delivery and one verified execution.
- Each inspected execution contained the signed timestamp, BattleMetrics request ID,
  `application/json` content type, and the configured JSON body.
- No shared secret, signature header, raw-body duplicate, Authorization data, cookies, or full headers
  appeared in output.

Only these sanitized findings are retained. No live URL, server identifier, address, RCON password,
shared secret, request ID, raw header set, or execution export is stored in this repository.
