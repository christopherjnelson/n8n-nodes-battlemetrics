/* eslint-disable n8n-nodes-base/node-filename-against-convention -- This is a test module, not a node implementation. */
/* eslint-disable n8n-nodes-base/node-class-description-credentials-name-unsuffixed -- The tested credential is deliberately a webhook secret, not an API credential. */
import { createHmac } from 'node:crypto';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { BattleMetricsWebhook } from '../../../credentials/BattleMetricsWebhook.credentials';
import { BattleMetricsTrigger } from '../BattleMetricsTrigger.node';

const timestamp = '2026-01-01T00:00:00.000Z';
const secret = 'safe-unit-test-secret';

function signature(body: Buffer, signingSecret = secret): string {
	return createHmac('sha256', signingSecret)
		.update(timestamp)
		.update('.')
		.update(body)
		.digest('hex');
}

function context(options: {
	body?: Buffer;
	contentType?: string;
	signature?: string | string[];
	requestId?: string;
	credentialSecret?: string;
	rawBodyInitiallyMissing?: boolean;
}) {
	const body = options.body ?? Buffer.from('{}');
	const headers: Record<string, string | string[] | undefined> = {
		'content-type': options.contentType ?? 'application/json',
		'x-signature': options.signature ?? `t=${timestamp},s=${signature(body)}`,
		'x-request-id': options.requestId,
		cookie: 'must-not-emit',
		authorization: 'must-not-emit',
	};
	const request = {
		headers,
		rawHeaders: Object.entries(headers)
			.filter(([, value]) => value !== undefined)
			.flatMap(([name, value]) => [name, String(value)]),
		rawBody: options.rawBodyInitiallyMissing ? undefined : body,
		readRawBody: vi.fn(async function (this: { rawBody?: Buffer }) {
			this.rawBody = body;
		}),
	};
	const response = {
		status: vi.fn().mockReturnThis(),
		type: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	};
	return {
		request,
		response,
		webhookContext: {
			getRequestObject: () => request,
			getResponseObject: () => response,
			getCredentials: vi.fn().mockResolvedValue({
				sharedSecret: options.credentialSecret ?? secret,
			}),
		} as unknown as IWebhookFunctions,
	};
}

describe('BattleMetrics Webhook credential', () => {
	it('is a separate required password field with no auth injection or test', () => {
		const credential = new BattleMetricsWebhook();
		expect(credential.name).toBe('battleMetricsWebhook');
		expect(credential.displayName).toBe('BattleMetrics Webhook');
		expect(credential.properties).toContainEqual(
			expect.objectContaining({
				name: 'sharedSecret',
				displayName: 'Shared Secret',
				required: true,
				typeOptions: { password: true },
			}),
		);
		expect(credential).not.toHaveProperty('authenticate');
		expect(credential).not.toHaveProperty('test');
	});
});

describe('BattleMetrics Trigger metadata', () => {
	it('defines a manual, immediate POST trigger without AI-tool or lifecycle registration', () => {
		const node = new BattleMetricsTrigger();
		expect(node.constructor.name).toBe('BattleMetricsTrigger');
		expect(node.description).toMatchObject({
			displayName: 'BattleMetrics Trigger',
			name: 'battleMetricsTrigger',
			group: ['trigger'],
			version: 1,
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'battleMetricsWebhook', required: true }],
			webhooks: [
				{
					name: 'default',
					httpMethod: 'POST',
					responseMode: 'onReceived',
					responseData: 'noData',
					path: 'webhook',
				},
			],
		});
		expect(node.description.icon).toEqual({
			light: 'file:battleMetrics.svg',
			dark: 'file:battleMetrics.dark.svg',
		});
		expect(node.description).not.toHaveProperty('usableAsTool');
		expect(node).not.toHaveProperty('webhookMethods');
		expect(node.description.properties).toContainEqual(
			expect.objectContaining({ name: 'options', type: 'hidden', default: { binaryData: true } }),
		);
	});
});

describe('BattleMetrics Trigger webhook', () => {
	it.each([
		['{"event":"server.update"}', 'application/json', { event: 'server.update' }],
		['[1,2]', 'application/json; charset=utf-8', [1, 2]],
		['null', 'application/json', null],
		[' hello 🦖\n', 'text/plain; charset=utf-8', ' hello 🦖\n'],
	] as const)('emits one safe verified item for %s', async (source, contentType, expected) => {
		const body = Buffer.from(source);
		const fixture = context({ body, contentType, requestId: 'synthetic-request-id' });
		const result = await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
		expect(result).toEqual({
			workflowData: [
				[
					{
						json: {
							body: expected,
							webhook: {
								verified: true,
								timestamp,
								requestId: 'synthetic-request-id',
								contentType: contentType.startsWith('text/') ? 'text/plain' : 'application/json',
							},
						},
					},
				],
			],
		});
		expect(JSON.stringify(result)).not.toMatch(/x-signature|authorization|cookie/i);
		expect(JSON.stringify(result)).not.toContain(secret);
	});

	it('reads the raw body when it has not already been captured', async () => {
		const fixture = context({ rawBodyInitiallyMissing: true });
		await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
		expect(fixture.request.readRawBody).toHaveBeenCalledOnce();
	});

	it('omits a missing request ID', async () => {
		const fixture = context({});
		const result = await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
		expect(result.workflowData?.[0]?.[0]?.json.webhook).not.toHaveProperty('requestId');
	});

	it.each([
		['missing signature', undefined, 'application/json', 401],
		['invalid signature', `t=${timestamp},s=${'0'.repeat(64)}`, 'application/json', 401],
		['unsupported content type', undefined, 'application/xml', 415],
	] as const)(
		'rejects %s without workflow output',
		async (_name, suppliedSignature, contentType, code) => {
			const fixture = context({
				contentType,
				...(suppliedSignature === undefined ? {} : { signature: suppliedSignature }),
			});
			if (_name === 'missing signature') {
				delete fixture.request.headers['x-signature'];
				fixture.request.rawHeaders = fixture.request.rawHeaders.filter(
					(value) => !String(value).startsWith('t='),
				);
			}
			const result = await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
			expect(result).toEqual({ noWebhookResponse: true });
			expect(fixture.response.status).toHaveBeenCalledWith(code);
		},
	);

	it('returns 400 for validly signed malformed JSON without reflecting it', async () => {
		const body = Buffer.from('{"private":"never-reflect"');
		const fixture = context({ body });
		const result = await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(fixture.response.status).toHaveBeenCalledWith(400);
		expect(fixture.response.send).toHaveBeenCalledWith('Bad Request');
		expect(JSON.stringify(fixture.response.send.mock.calls)).not.toContain('never-reflect');
	});

	it('authenticates before interpreting content type or JSON', async () => {
		const body = Buffer.from('{malformed');
		const fixture = context({ body, signature: `t=${timestamp},s=${'0'.repeat(64)}` });
		await new BattleMetricsTrigger().webhook.call(fixture.webhookContext);
		expect(fixture.response.status).toHaveBeenCalledWith(401);
	});
});
