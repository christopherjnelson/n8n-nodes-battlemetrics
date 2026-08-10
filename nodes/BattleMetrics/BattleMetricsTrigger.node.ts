import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { parseVerifiedBody } from './lib/webhookBody';
import {
	getSingleSignatureHeader,
	parseSignatureHeader,
	verifySignature,
	WebhookRequestError,
} from './lib/webhookSignature';

/* eslint-disable @n8n/community-nodes/webhook-lifecycle-complete -- BattleMetrics webhooks are manually registered; no official registration API is documented. */
/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown -- Status-bearing validation errors are caught inside webhook() and converted to fixed HTTP responses. */
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed -- This is a webhook credential, not an API credential.
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

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		try {
			const request = this.getRequestObject();
			if (!Buffer.isBuffer(request.rawBody)) await request.readRawBody();
			if (!Buffer.isBuffer(request.rawBody)) {
				throw new WebhookRequestError(500, 'Exact raw request body is unavailable');
			}

			const header = getSingleSignatureHeader(request.headers, request.rawHeaders);
			const signature = parseSignatureHeader(header);
			const credentials = (await this.getCredentials(
				'battleMetricsWebhook',
			)) as ICredentialDataDecryptedObject;
			const sharedSecret = credentials.sharedSecret;
			if (typeof sharedSecret !== 'string') {
				throw new WebhookRequestError(500, 'Webhook credential is not configured');
			}
			verifySignature(request.rawBody, sharedSecret, signature);

			const contentTypeHeader = request.headers['content-type'];
			if (Array.isArray(contentTypeHeader)) {
				throw new WebhookRequestError(415, 'Unsupported media type');
			}
			const parsed = parseVerifiedBody(request.rawBody, contentTypeHeader);
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
			return rejectRequest(this, 500);
		}
	}
}
