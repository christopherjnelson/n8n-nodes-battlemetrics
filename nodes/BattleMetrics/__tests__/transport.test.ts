import type { IExecuteFunctions } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import {
	battleMetricsApiRequest,
	battleMetricsApiRequestUrl,
	encodedApiPath,
	queryObject,
} from '../transport/request';
import { DEFAULT_TIMEOUT_MS, JSON_API_MEDIA_TYPE } from '../transport/constants';

function context(response: unknown) {
	const request = vi.fn().mockResolvedValue(response);
	return {
		request,
		value: {
			getCredentials: async () => ({ accessToken: 'synthetic-token' }),
			helpers: { httpRequestWithAuthentication: request },
		},
	};
}

describe('BattleMetrics transport', () => {
	it('encodes every dynamic path segment', () => {
		expect(encodedApiPath(['servers', 'opaque/id ?#'])).toBe('/servers/opaque%2Fid%20%3F%23');
	});

	it('builds typed query objects and omits undefined values', () => {
		expect(
			queryObject({ 'page[size]': 10, 'filter[search]': 'synthetic', omitted: undefined }),
		).toEqual({
			'page[size]': 10,
			'filter[search]': 'synthetic',
		});
	});

	it('uses authentication, official headers, fixed origin, and timeout', async () => {
		const mock = context({ data: { type: 'server', id: 'opaque-id' } });
		await battleMetricsApiRequest.call(mock.value as unknown as IExecuteFunctions, {
			method: 'GET',
			pathSegments: ['servers', 'opaque-id'],
			query: { include: 'game' },
			operation: 'Server: Get',
			itemIndex: 0,
		});
		expect(mock.request).toHaveBeenCalledWith(
			'battleMetricsApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.battlemetrics.com/servers/opaque-id',
				headers: {
					Accept: JSON_API_MEDIA_TYPE,
					Authorization: 'Bearer synthetic-token',
				},
				timeout: DEFAULT_TIMEOUT_MS,
			}),
		);
	});

	it('requests an already-encoded same-origin pagination URL unchanged', async () => {
		const mock = context({ data: [] });
		await battleMetricsApiRequestUrl.call(mock.value as unknown as IExecuteFunctions, {
			method: 'GET',
			url: new URL(
				'https://api.battlemetrics.com/servers?filter%5Bsearch%5D=synthetic%20value&page%5Boffset%5D=10',
			),
			operation: 'Server: Get Many',
			itemIndex: 0,
		});
		expect(mock.request.mock.calls[0]?.[1]).toMatchObject({
			url: 'https://api.battlemetrics.com/servers?filter%5Bsearch%5D=synthetic%20value&page%5Boffset%5D=10',
		});
		expect(mock.request.mock.calls[0]?.[1]).not.toHaveProperty('qs');
	});

	it.each([
		'http://api.battlemetrics.com/servers',
		'https://example.com/servers',
		'https://user:secret@api.battlemetrics.com/servers',
	])('refuses unsafe direct pagination URLs: %s', async (url) => {
		const mock = context({ data: [] });
		await expect(
			battleMetricsApiRequestUrl.call(mock.value as unknown as IExecuteFunctions, {
				method: 'GET',
				url: new URL(url),
				operation: 'Server: Get Many',
				itemIndex: 0,
			}),
		).rejects.toMatchObject({ message: expect.stringContaining('Unsafe pagination link') });
		expect(mock.request).not.toHaveBeenCalled();
	});

	it('adds Content-Type only when a future request has a body', async () => {
		const mock = context({ data: { type: 'ban', id: 'synthetic-id' } });
		await battleMetricsApiRequest.call(mock.value as unknown as IExecuteFunctions, {
			method: 'POST',
			pathSegments: ['future-not-implemented'],
			body: { data: null },
			operation: 'Synthetic test only',
			itemIndex: 0,
		});
		expect(mock.request).toHaveBeenCalledWith(
			'battleMetricsApi',
			expect.objectContaining({
				headers: {
					Accept: JSON_API_MEDIA_TYPE,
					Authorization: 'Bearer synthetic-token',
					'Content-Type': JSON_API_MEDIA_TYPE,
				},
			}),
		);
	});

	it('reports malformed JSON:API with item and operation context', async () => {
		const mock = context({ unexpected: true });
		await expect(
			battleMetricsApiRequest.call(mock.value as unknown as IExecuteFunctions, {
				method: 'GET',
				pathSegments: ['servers', 'opaque-id'],
				operation: 'Server: Get',
				itemIndex: 4,
			}),
		).rejects.toMatchObject({
			context: { operation: 'Server: Get', itemIndex: 4, category: 'malformedResponse' },
		});
	});

	it('never includes a credential value in normalized errors', async () => {
		const token = 'synthetic-super-secret-token';
		const request = vi.fn().mockRejectedValue(new Error(`Authorization: Bearer ${token}`));
		const value = {
			getCredentials: async () => ({ accessToken: token }),
			helpers: { httpRequestWithAuthentication: request },
		};
		await expect(
			battleMetricsApiRequest.call(value as unknown as IExecuteFunctions, {
				method: 'GET',
				pathSegments: ['servers', 'opaque-id'],
				operation: 'Server: Get',
				itemIndex: 0,
			}),
		).rejects.not.toThrow(token);
	});
});
