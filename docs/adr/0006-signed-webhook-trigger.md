# ADR 0006: Verify BattleMetrics webhooks against exact raw bytes

- Status: Accepted
- Date: 2026-08-04
- BattleMetrics documentation reviewed: 2026-08-04
- Runtime verified: n8n 2.30.6 on Node.js 24.18.0
- Real BattleMetrics-originated delivery verified: Phase 2B

## Context

BattleMetrics documents outbound webhooks as manually configured HTTP `POST` actions with either
`application/json` or `text/plain`. Every request has an `X-Signature` containing an ISO-8601 `t`
component and hexadecimal `s` component. The signature is HMAC-SHA256 over the timestamp, a literal
period, and the request body. The body bytes must therefore remain unchanged. The User-Agent and
`X-Request-ID` are not authentication. The first-party page recommends a quick 2xx response, uses a
five-second timeout, does not follow redirects, and retries/backoffs after non-2xx responses. The
first-party article describes personal webhooks as available to all users and organization webhooks as
requiring **Use Trigger Webhooks**. That documentation statement does not remove the practical RCON and
server-control requirements observed later for the tested native server/game triggers.

Authoritative source: [BattleMetrics Webhooks](https://learn.battlemetrics.com/article/47-webhooks).
The page reports “Last updated on February 6, 2024” and was re-read on the date above.

## n8n 2.30.6 findings

An `INodeType` community trigger declares `webhooks` in its description and implements
`webhook(this: IWebhookFunctions)`. A `path: 'webhook'` description gives the standard Test and
Production URL treatment. Test registration exists only while the editor is listening; production
registration exists for an active workflow. The credential is decrypted inside `webhook()` through
`this.getCredentials('battleMetricsWebhook')`.

n8n's `rawBodyReader` adds `readRawBody()` to the Express request. That method reads the incoming stream
with the `raw-body` package and assigns a Node.js `Buffer` to `req.rawBody`. Its normal body parser later
decodes that same buffer. For a version-1 webhook node, n8n 2.30.6 skips its parser when the internal
`options.binaryData` parameter is true. The trigger therefore supplies a hidden, non-expression default
of `{ "binaryData": true }`, calls `readRawBody()` itself when needed, and refuses the request unless
`rawBody` is a `Buffer`. It never verifies parsed or reserialized input.

The isolated HTTP proof sent JSON with deliberate whitespace, reordered keys, trailing newlines, empty
text, and multibyte UTF-8 to real Test and activated Production endpoints. Matching signatures succeeded;
one-byte changes failed. A signed malformed JSON body reached the node and returned 400, establishing
that the n8n pre-parser had not consumed or rejected it first. This behavior is version-specific and must
be repeated before changing the supported n8n baseline.

`responseMode: 'onReceived'` does not respond until the trigger node has authenticated and returned its
workflow data. n8n then starts the workflow runner and sends the configured response without awaiting
downstream completion. Direct failures use `getResponseObject()` to send a fixed status/body and return
`noWebhookResponse: true`; those requests create no workflow item.

## Decision

Create a separate `BattleMetrics Webhook Trigger` and `BattleMetrics Webhook` credential. Do not register or
delete anything at BattleMetrics during activation; users paste n8n's URL into a BattleMetrics Webhook
action. The node is a push receiver and never polls. Live setup showed that native server/game triggers
are managed in BattleMetrics' RCON / Triggers product and, for the tested events, require an
owner-controlled server connected to BattleMetrics RCON; a public server ID alone is insufficient.

Strictly accept one header with exactly one `t` and one `s`. Reject duplicates, arrays, unknown future
components, invalid timestamps, non-hex signatures, wrong digest lengths, and internal whitespace.
Allow harmless whitespace only around comma-delimited components and accept hexadecimal in either case.
Compare equal-length digest buffers with Node's `timingSafeEqual`.

Authenticate before media-type validation and parsing. Accept only JSON or plain text with no parameter
or UTF-8 charset. Decode UTF-8 strictly. Wrap any JSON value or exact decoded text under `body`; emit only
`verified`, the signed timestamp, normalized content type, and optional debugging `X-Request-ID` under
`webhook`. Never emit raw bytes, full headers, `X-Signature`, cookies, authorization, or the secret.

Use 200 with no body on success, 401 for signature failures, 415 for unsupported media, 400 for a
verified malformed body, and 500 if raw bytes or credentials are internally unavailable.

## Timestamp, retries, and replay

The signature timestamp is syntax-validated and authenticated but has no receiver freshness cutoff.
BattleMetrics does not publicly specify whether retry attempts reuse a timestamp/signature or request ID,
nor a required receiver tolerance. A default maximum age could reject legitimate backoff retries. An
in-memory replay cache would fail across workers and restarts and is not durable replay prevention.

Signature verification proves possession of the shared secret and integrity of the signed bytes. It does
not promise exactly-once delivery. `X-Request-ID` is safe debugging/deduplication metadata, not
authentication. Workflows with non-idempotent effects should implement durable downstream deduplication
appropriate to their n8n deployment.

## Consequences

- Runtime dependencies remain zero; cryptography uses `node:crypto`.
- Unsupported or unverifiable requests fail closed and produce no workflow data.
- Updating n8n requires a new exact-byte and immediate-response proof.
- A future freshness policy needs first-party retry semantics and explicit user-facing compatibility
  controls; durable replay prevention requires shared storage and is outside this node.

## Phase 2B real-origin verification

Owner-run testing established real BattleMetrics-originated signed delivery through an activated n8n
Production URL. One deliberately invoked native Server Action returned HTTP 200 and created one
execution. Two deliberate map changes on an RCON-connected Insurgency 2014 server each caused the native
Started Map trigger to send one automatic webhook, each returning HTTP 200 and creating one execution.
No n8n polling or manual BattleMetrics action caused either automatic delivery.

All three inspected outputs had `webhook.verified === true`, a signed timestamp, a BattleMetrics request
ID, normalized `application/json` content type, and the configured JSON body. They contained no shared
secret, signature header, raw-body duplicate, Authorization data, cookies, or full headers. Only this
sanitized finding is recorded; no endpoint, server/RCON secret, live identifier, raw header set, or
execution export is retained.

Started Map is consequently the preferred deterministic automatic demonstration. Server Action is the
recommended manual connectivity test. Server Update remains supported upstream but was extremely noisy
in practical testing and should be used only with deliberate filtering.

## Display-name audit

`BattleMetrics Webhook Trigger` would more precisely communicate that the node receives a Webhook action
and does not create the upstream native trigger. It would also distinguish the n8n node from
BattleMetrics' own RCON trigger object. The costs are a longer canvas/search label, documentation and
screenshot churn, and potential user confusion after adoption.

Phase 2C implemented the recommended display-name-only change to `BattleMetrics Webhook Trigger` before
publication. The stable internal name `battleMetricsTrigger`, codex identity
`n8n-nodes-battlemetrics.battleMetricsTrigger`, credential identity, webhook path behavior, and existing
workflow compatibility remain unchanged. ADR 0007 records the final identity and codex-category
decision.
