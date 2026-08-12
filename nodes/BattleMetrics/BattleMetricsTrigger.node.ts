import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { parseVerifiedBody } from './lib/webhookBody';
import { webhookNodeError, webhookNodeErrorStatus } from './lib/webhookErrors';
import {
	getSingleSignatureHeader,
	parseSignatureHeader,
	verifySignature,
	WebhookRequestError,
} from './lib/webhookSignature';

/* eslint-disable @n8n/community-nodes/node-usable-as-tool -- Trigger nodes must not be exposed as AI tools. */

function rejectRequest(
	context: IWebhookFunctions,
	statusCode: 400 | 401 | 415 | 500,
): IWebhookResponseData {
	const response = context.getResponseObject();
	const message =
		statusCode === 400
			? 'Bad Request'
			: statusCode === 401
				? 'Unauthorized'
				: statusCode === 415
					? 'Unsupported Media Type'
					: 'Internal Server Error';
	response.status(statusCode).type('text/plain').send(message);
	return { noWebhookResponse: true };
}

export class BattleMetricsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BattleMetrics Webhook Trigger',
		name: 'battleMetricsTrigger',
		icon: { light: 'file:battleMetrics.svg', dark: 'file:battleMetrics.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Receive and verify manually configured BattleMetrics webhooks (unofficial)',
		subtitle: 'Signed webhook receiver',
		defaults: { name: 'BattleMetrics Webhook Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'battleMetricsWebhookApi',
				required: true,
				testedBy: 'battleMetricsWebhookCredentialTest',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				responseData: 'noData',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Internal Raw Body Mode',
				name: 'options',
				type: 'hidden',
				default: { binaryData: true },
				noDataExpression: true,
			},
			{
				displayName:
					'In BattleMetrics RCON / Triggers, copy the Test or Production URL into a Webhook action and use the same shared secret in BattleMetrics and this node credential. This node receives pushed events; it does not poll or register the BattleMetrics trigger.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = {
		credentialTest: {
			async battleMetricsWebhookCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const sharedSecret = credential.data?.sharedSecret;
				if (typeof sharedSecret !== 'string' || sharedSecret.trim() === '') {
					return {
						status: 'Error',
						message: 'A non-empty BattleMetrics webhook shared secret is required.',
					};
				}
				return {
					status: 'OK',
					message:
						'Shared secret is configured. BattleMetrics verifies the matching secret when a signed webhook is received.',
				};
			},
		},
	};

	webhookMethods = {
		default: {
			// BattleMetrics webhook actions must be configured manually in the BattleMetrics
			// trigger UI. BattleMetrics does not expose an API for webhook lifecycle management,
			// so n8n has no remote registration state to create, inspect, or delete here.
			// These lifecycle hooks intentionally acknowledge activation/deactivation locally.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		try {
			const request = this.getRequestObject();
			if (!Buffer.isBuffer(request.rawBody)) await request.readRawBody();
			if (!Buffer.isBuffer(request.rawBody)) {
				throw webhookNodeError(this.getNode(), 500, 'Exact raw request body is unavailable');
			}

			const header = getSingleSignatureHeader(request.headers, request.rawHeaders);
			const signature = parseSignatureHeader(header);
			const credentials = (await this.getCredentials(
				'battleMetricsWebhookApi',
			)) as ICredentialDataDecryptedObject;
			const sharedSecret = credentials.sharedSecret;
			if (typeof sharedSecret !== 'string') {
				throw webhookNodeError(this.getNode(), 500, 'Webhook credential is not configured');
			}
			verifySignature(request.rawBody, sharedSecret, signature);

			const contentTypeHeader = request.headers['content-type'];
			if (Array.isArray(contentTypeHeader)) {
				throw webhookNodeError(this.getNode(), 415, 'Unsupported media type');
			}
			const parsed = parseVerifiedBody(this.getNode(), request.rawBody, contentTypeHeader);
			const requestIdHeader = request.headers['x-request-id'];
			const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : undefined;
			const output: IDataObject = {
				body: parsed.body as IDataObject,
				webhook: {
					verified: true,
					timestamp: signature.timestamp,
					...(requestId === undefined ? {} : { requestId }),
					contentType: parsed.contentType,
				},
			};
			return { workflowData: [[{ json: output }]] };
		} catch (error) {
			if (error instanceof WebhookRequestError) return rejectRequest(this, error.statusCode);
			if (error instanceof NodeOperationError) {
				return rejectRequest(this, webhookNodeErrorStatus(error));
			}
			return rejectRequest(this, 500);
		}
	}
}
