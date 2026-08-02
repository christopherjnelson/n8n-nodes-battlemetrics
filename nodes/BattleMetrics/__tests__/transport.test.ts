import type { IExecuteFunctions } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { battleMetricsApiRequest, encodedApiPath, queryObject } from '../transport/request';
import { DEFAULT_TIMEOUT_MS, JSON_API_MEDIA_TYPE } from '../transport/constants';

function context(response: unknown) {
	const request = vi.fn().mockResolvedValue(response);
	return {
		request,
		value: {
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
				headers: { Accept: JSON_API_MEDIA_TYPE },
				timeout: DEFAULT_TIMEOUT_MS,
			}),
		);
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
				headers: { Accept: JSON_API_MEDIA_TYPE, 'Content-Type': JSON_API_MEDIA_TYPE },
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
			context: { operation: 'Server: Get', itemIndex: 4 },
		});
	});

	it('never includes a credential value in normalized errors', async () => {
		const token = 'synthetic-super-secret-token';
		const request = vi.fn().mockRejectedValue(new Error(`Authorization: Bearer ${token}`));
		const value = { helpers: { httpRequestWithAuthentication: request } };
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
