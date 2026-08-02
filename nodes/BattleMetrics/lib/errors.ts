import type { JsonApiErrorDocument } from './jsonApi';

const MAX_ERROR_TEXT = 1_000;
const SECRET_PATTERNS = [
	/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
	/(authorization|cookie)\s*[:=]\s*[^,;\s]+/gi,
];

export interface SafeErrorContext {
	operation: string;
	itemIndex: number;
	statusCode?: number;
	retryAfter?: string;
}

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

export function normalizeError(
	error: unknown,
	context: Omit<SafeErrorContext, 'statusCode' | 'retryAfter'>,
): BattleMetricsRequestError {
	if (error instanceof BattleMetricsRequestError) return error;
	const record =
		typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
	const response =
		typeof record.response === 'object' && record.response !== null
			? (record.response as Record<string, unknown>)
			: undefined;
	const statusCode =
		typeof record.statusCode === 'number'
			? record.statusCode
			: typeof response?.statusCode === 'number'
				? response.statusCode
				: undefined;
	const body = response?.body ?? record.body;
	const apiDetails = errorDocumentDetails(body);
	const originalMessage = error instanceof Error ? error.message : String(error);
	const message = redactSensitive(apiDetails ?? originalMessage ?? 'Unknown BattleMetrics error');
	const headers =
		typeof response?.headers === 'object' && response.headers !== null
			? (response.headers as Record<string, unknown>)
			: {};
	return new BattleMetricsRequestError(message, {
		...context,
		...(statusCode === undefined ? {} : { statusCode }),
		...(safeRetryAfter(headers['retry-after']) === undefined
			? {}
			: { retryAfter: safeRetryAfter(headers['retry-after']) }),
	});
}
