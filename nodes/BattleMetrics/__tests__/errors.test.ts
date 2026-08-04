import { describe, expect, it } from 'vitest';
import { normalizeError, redactSensitive, safeRetryAfter } from '../lib/errors';

describe('safe error normalization', () => {
	it.each([400, 401, 403, 404, 409, 422, 429, 500, 502, 503])(
		'preserves useful status %s',
		(statusCode) => {
			const normalized = normalizeError(
				{
					statusCode,
					response: {
						body: {
							errors: [{ status: String(statusCode), title: 'Synthetic API error' }],
						},
					},
				},
				{ operation: 'Server: Get', itemIndex: 2 },
			);
			expect(normalized.context).toMatchObject({ statusCode, itemIndex: 2 });
			expect(normalized.message).toContain('Synthetic API error');
		},
	);

	it.each(['Request timed out', 'ECONNRESET network failure', 'getaddrinfo ENOTFOUND DNS failure'])(
		'preserves concise transport failure: %s',
		(message) => {
			expect(normalizeError(new Error(message), { operation: 'Get', itemIndex: 0 }).message).toBe(
				message,
			);
		},
	);

	it('redacts bearer tokens and authorization headers', () => {
		const token = 'synthetic-secret-token-value';
		const output = redactSensitive(`Bearer ${token} authorization=${token}`);
		expect(output).not.toContain(token);
		expect(output).toContain('[REDACTED]');
	});

	it('limits giant response messages', () => {
		expect(redactSensitive('x'.repeat(50_000))).toHaveLength(1_000);
	});

	it('handles safe Retry-After values', () => {
		expect(safeRetryAfter('30')).toBe('30');
		expect(safeRetryAfter('not-valid')).toBeUndefined();
		expect(safeRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBe('Wed, 21 Oct 2026 07:28:00 GMT');
	});

	it('records Retry-After without copying arbitrary headers', () => {
		const normalized = normalizeError(
			{ response: { statusCode: 429, headers: { 'retry-after': '12', authorization: 'secret' } } },
			{ operation: 'Get', itemIndex: 0 },
		);
		expect(normalized.context.retryAfter).toBe('12');
		expect(normalized.context.category).toBe('rateLimited');
		expect(JSON.stringify(normalized)).not.toContain('authorization');
	});

	it.each([
		[401, 'The authentication token provided is invalid or expired', 'invalidCredential'],
		[403, 'A subscription is required to use the API', 'subscriptionRequired'],
		[403, 'You may not access this organization', 'permissionDenied'],
		[404, 'Resource not found', 'resourceNotFound'],
		[429, 'Too many requests', 'rateLimited'],
		[500, 'Internal server error', 'serverError'],
	] as const)('classifies HTTP %s as %s-safe category %s', (statusCode, detail, category) => {
		const normalized = normalizeError(
			{
				response: {
					statusCode,
					body: { errors: [{ status: String(statusCode), title: 'Request failed', detail }] },
				},
			},
			{ operation: 'Server: Get Many', itemIndex: 0 },
		);
		expect(normalized.context.category).toBe(category);
	});

	it.each([
		['Request timed out', 'timeout'],
		['ECONNRESET network failure', 'networkError'],
		['Unexpected token in JSON', 'malformedResponse'],
	] as const)('classifies transport failure %s as %s', (message, category) => {
		expect(
			normalizeError(new Error(message), { operation: 'Server: Get Many', itemIndex: 0 }).context
				.category,
		).toBe(category);
	});

	it('removes a token from API error documents and all visible fields', () => {
		const token = 'synthetic-secret-token-in-body';
		const normalized = normalizeError(
			{
				response: {
					statusCode: 401,
					body: {
						errors: [{ status: '401', title: 'Unauthorized', detail: `Bearer ${token}` }],
					},
				},
			},
			{ operation: 'Server: Get Many', itemIndex: 0 },
		);
		expect(JSON.stringify(normalized)).not.toContain(token);
	});
});
