import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const WEBHOOK_ERROR_TYPES = {
	badRequest: 'battleMetricsWebhookBadRequest',
	unauthorized: 'battleMetricsWebhookUnauthorized',
	unsupportedMediaType: 'battleMetricsWebhookUnsupportedMediaType',
	internal: 'battleMetricsWebhookInternal',
} as const;

type WebhookStatusCode = 400 | 401 | 415 | 500;

export function webhookNodeError(
	node: INode,
	statusCode: WebhookStatusCode,
	message: string,
): NodeOperationError {
	const type =
		statusCode === 400
			? WEBHOOK_ERROR_TYPES.badRequest
			: statusCode === 401
				? WEBHOOK_ERROR_TYPES.unauthorized
				: statusCode === 415
					? WEBHOOK_ERROR_TYPES.unsupportedMediaType
					: WEBHOOK_ERROR_TYPES.internal;
	return new NodeOperationError(node, message, { type });
}

export function webhookNodeErrorStatus(error: NodeOperationError): WebhookStatusCode {
	if (error.type === WEBHOOK_ERROR_TYPES.badRequest) return 400;
	if (error.type === WEBHOOK_ERROR_TYPES.unauthorized) return 401;
	if (error.type === WEBHOOK_ERROR_TYPES.unsupportedMediaType) return 415;
	return 500;
}
