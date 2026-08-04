import { WebhookRequestError } from './webhookSignature';

/* eslint-disable @n8n/community-nodes/require-node-api-error -- Parsing errors are converted to fixed webhook HTTP responses and never enter workflow execution. */

export type BattleMetricsWebhookBody =
	| Record<string, unknown>
	| unknown[]
	| string
	| number
	| boolean
	| null;

export interface ParsedWebhookBody {
	body: BattleMetricsWebhookBody;
	contentType: 'application/json' | 'text/plain';
}

function normalizedMediaType(contentType: string | undefined): 'application/json' | 'text/plain' {
	if (contentType === undefined) throw new WebhookRequestError(415, 'Unsupported media type');
	const [mediaType, ...parameters] = contentType.split(';');
	const normalized = mediaType?.trim().toLowerCase();
	if (normalized !== 'application/json' && normalized !== 'text/plain') {
		throw new WebhookRequestError(415, 'Unsupported media type');
	}
	for (const parameter of parameters) {
		const [name, value, ...rest] = parameter.split('=');
		if (
			rest.length > 0 ||
			name?.trim().toLowerCase() !== 'charset' ||
			value?.trim().replace(/^"|"$/g, '').toLowerCase() !== 'utf-8'
		) {
			throw new WebhookRequestError(415, 'Unsupported media type');
		}
	}
	return normalized;
}

function decodeUtf8(rawBody: Buffer): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
	} catch {
		throw new WebhookRequestError(400, 'Invalid UTF-8 request body');
	}
}

export function parseVerifiedBody(
	rawBody: Buffer,
	contentTypeHeader: string | undefined,
): ParsedWebhookBody {
	const contentType = normalizedMediaType(contentTypeHeader);
	const text = decodeUtf8(rawBody);
	if (contentType === 'text/plain') return { body: text, contentType };

	try {
		return { body: JSON.parse(text) as BattleMetricsWebhookBody, contentType };
	} catch {
		throw new WebhookRequestError(400, 'Malformed JSON request body');
	}
}
