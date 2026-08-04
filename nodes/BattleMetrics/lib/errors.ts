import type { JsonApiErrorDocument } from './jsonApi';

const MAX_ERROR_TEXT = 1_000;
const SECRET_PATTERNS = [
	/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
	/(authorization|cookie)\s*[:=]\s*[^,;\s]+/gi,
];

export interface SafeErrorContext {
	operation: string;
	itemIndex: number;
	category: BattleMetricsErrorCategory;
	statusCode?: number;
	retryAfter?: string;
}

export type BattleMetricsErrorCategory =
	| 'invalidCredential'
	| 'subscriptionRequired'
	| 'permissionDenied'
	| 'resourceNotFound'
	| 'rateLimited'
	| 'serverError'
	| 'timeout'
	| 'networkError'
	| 'malformedResponse'
	| 'requestFailed';

export class BattleMetricsRequestError extends Error {
	constructor(
		message: string,
		readonly context: SafeErrorContext,
	) {
		super(message);
		this.name = 'BattleMetricsRequestError';
	}
}

export function redactSensitive(value: string): string {
	let result = value;
	for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, '[REDACTED]');
	return result.slice(0, MAX_ERROR_TEXT);
}

export function safeRetryAfter(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (/^\d{1,9}$/.test(trimmed)) return trimmed;
	const parsed = Date.parse(trimmed);
	return Number.isNaN(parsed) ? undefined : new Date(parsed).toUTCString();
}

function errorDocumentDetails(value: unknown): string | undefined {
	if (typeof value !== 'object' || value === null || !('errors' in value)) return undefined;
	const errors = (value as Partial<JsonApiErrorDocument>).errors;
	if (!Array.isArray(errors)) return undefined;
	const details = errors
		.slice(0, 3)
		.map((error) =>
			[error.status, error.code, error.title, error.detail].filter(Boolean).join(' — '),
		)
		.filter(Boolean)
		.join('; ');
	return details === '' ? undefined : details;
}

function errorCategory(
	statusCode: number | undefined,
	details: string | undefined,
	originalMessage: string,
): BattleMetricsErrorCategory {
	if (statusCode === 401) return 'invalidCredential';
	if (statusCode === 403) {
		return /subscription/i.test(details ?? originalMessage)
			? 'subscriptionRequired'
			: 'permissionDenied';
	}
	if (statusCode === 404) return 'resourceNotFound';
	if (statusCode === 429) return 'rateLimited';
	if (statusCode !== undefined && statusCode >= 500) return 'serverError';
	if (/malformed|unexpected token|invalid json/i.test(originalMessage)) return 'malformedResponse';
	if (/timed?\s*out|timeout|ETIMEDOUT/i.test(originalMessage)) return 'timeout';
	if (/ECONN|ENOTFOUND|EAI_AGAIN|network|socket|DNS/i.test(originalMessage)) return 'networkError';
	return 'requestFailed';
}

function httpStatus(value: unknown): number | undefined {
	const parsed =
		typeof value === 'number'
			? value
			: typeof value === 'string' && /^\d{3}$/.test(value.trim())
				? Number(value)
				: undefined;
	return parsed !== undefined && Number.isInteger(parsed) && parsed >= 100 && parsed <= 599
		? parsed
		: undefined;
}

export function normalizeError(
	error: unknown,
	context: Pick<SafeErrorContext, 'operation' | 'itemIndex'>,
): BattleMetricsRequestError {
	if (error instanceof BattleMetricsRequestError) return error;
	const record =
		typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
	const response =
		typeof record.response === 'object' && record.response !== null
			? (record.response as Record<string, unknown>)
			: undefined;
	const statusCode =
		httpStatus(record.statusCode) ??
		httpStatus(record.httpCode) ??
		httpStatus(response?.statusCode) ??
		httpStatus(response?.status);
	const body = response?.body ?? record.body;
	const apiDetails = errorDocumentDetails(body);
	const originalMessage = error instanceof Error ? error.message : String(error);
	const message = redactSensitive(apiDetails ?? originalMessage ?? 'Unknown BattleMetrics error');
	const headers =
		typeof response?.headers === 'object' && response.headers !== null
			? (response.headers as Record<string, unknown>)
			: {};
	const retryAfter = safeRetryAfter(headers['retry-after']);
	return new BattleMetricsRequestError(message, {
		...context,
		category: errorCategory(statusCode, apiDetails, originalMessage),
		...(statusCode === undefined ? {} : { statusCode }),
		...(retryAfter === undefined ? {} : { retryAfter }),
	});
}
