import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { WEBHOOK_ERROR_TYPES } from './webhookErrors';

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

function normalizedMediaType(
	node: INode,
	contentType: string | undefined,
): 'application/json' | 'text/plain' {
	if (contentType === undefined) {
		throw new NodeOperationError(node, 'Unsupported media type', {
			type: WEBHOOK_ERROR_TYPES.unsupportedMediaType,
		});
	}
	const [mediaType, ...parameters] = contentType.split(';');
	const normalized = mediaType?.trim().toLowerCase();
	if (normalized !== 'application/json' && normalized !== 'text/plain') {
		throw new NodeOperationError(node, 'Unsupported media type', {
			type: WEBHOOK_ERROR_TYPES.unsupportedMediaType,
		});
	}
	for (const parameter of parameters) {
		const [name, value, ...rest] = parameter.split('=');
		if (
			rest.length > 0 ||
			name?.trim().toLowerCase() !== 'charset' ||
			value?.trim().replace(/^"|"$/g, '').toLowerCase() !== 'utf-8'
		) {
			throw new NodeOperationError(node, 'Unsupported media type', {
				type: WEBHOOK_ERROR_TYPES.unsupportedMediaType,
			});
		}
	}
	return normalized;
}

function decodeUtf8(node: INode, rawBody: Buffer): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
	} catch {
		throw new NodeOperationError(node, 'Invalid UTF-8 request body', {
			type: WEBHOOK_ERROR_TYPES.badRequest,
		});
	}
}

export function parseVerifiedBody(
	node: INode,
	rawBody: Buffer,
	contentTypeHeader: string | undefined,
): ParsedWebhookBody {
	const contentType = normalizedMediaType(node, contentTypeHeader);
	const text = decodeUtf8(node, rawBody);
	if (contentType === 'text/plain') return { body: text, contentType };

	try {
		return { body: JSON.parse(text) as BattleMetricsWebhookBody, contentType };
	} catch {
		throw new NodeOperationError(node, 'Malformed JSON request body', {
			type: WEBHOOK_ERROR_TYPES.badRequest,
		});
	}
}
