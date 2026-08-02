import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { BattleMetrics } from '../BattleMetrics.node';

const server = (id: string, extra: Record<string, unknown> = {}) => ({
	type: 'server',
	id,
	...extra,
});

interface CollectionParameters {
	returnAll: boolean;
	limit?: number;
}

function collectionContext(
	parameters: CollectionParameters[],
	responses: unknown[],
	continueOnFail = false,
) {
	const http = vi.fn();
	for (const response of responses) {
		if (
			response instanceof Error ||
			(typeof response === 'object' && response !== null && 'response' in response)
		) {
			http.mockRejectedValueOnce(response);
		} else {
			http.mockResolvedValueOnce(response);
		}
	}
	const inputs: INodeExecutionData[] = parameters.map((_, index) => ({ json: { input: index } }));
	return {
		http,
		value: {
			getInputData: () => inputs,
			getNodeParameter: (name: string, index: number) => {
				if (name === 'operation') return 'getAll';
				if (name === 'returnAll') return parameters[index]?.returnAll;
				if (name === 'limit') return parameters[index]?.limit;
				throw new Error(`Unexpected parameter: ${name}`);
			},
			continueOnFail: () => continueOnFail,
			getNode: () => ({
				name: 'BattleMetrics',
				type: 'battleMetrics',
				typeVersion: 1,
				position: [0, 0],
			}),
			helpers: { httpRequestWithAuthentication: http },
		},
	};
}

describe('Server: Get Many', () => {
	it('makes a minimal authenticated collection request without speculative query parameters', async () => {
		const mock = collectionContext([{ returnAll: false, limit: 10 }], [{ data: [server('one')] }]);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(mock.http).toHaveBeenCalledTimes(1);
		expect(mock.http).toHaveBeenCalledWith(
			'battleMetricsApi',
			expect.objectContaining({ method: 'GET', url: 'https://api.battlemetrics.com/servers' }),
		);
		expect(mock.http.mock.calls[0]?.[1]).not.toHaveProperty('qs');
		expect(outputs?.[0]?.json.data).toEqual([server('one')]);
		expect(outputs?.[0]?.pairedItem).toEqual({ item: 0 });
	});

	it('applies a local limit without over-returning primary resources', async () => {
		const mock = collectionContext(
			[{ returnAll: false, limit: 2 }],
			[
				{
					data: [server('one'), server('two'), server('three')],
					links: { self: '/servers', next: '/servers?page%5Boffset%5D=3' },
					meta: { total: 30 },
				},
			],
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect((outputs?.[0]?.json.data as Array<{ id: string }>).map(({ id }) => id)).toEqual([
			'one',
			'two',
		]);
		expect(outputs?.[0]?.json.meta).toMatchObject({
			n8n: {
				limitApplied: 2,
				primaryResourcesReturned: 2,
				truncated: true,
				sourcePageContext: [{ links: expect.any(Object), meta: { total: 30 } }],
			},
		});
		expect(mock.http).toHaveBeenCalledTimes(1);
	});

	it('returns an honest combined envelope in API order across relative and absolute next links', async () => {
		const mock = collectionContext(
			[{ returnAll: true }],
			[
				{ data: [server('1')], links: { next: '/servers?page%5Boffset%5D=1' } },
				{
					data: [server('2')],
					links: {
						next: 'https://api.battlemetrics.com/servers?page%5Boffset%5D=2',
					},
				},
				{ data: [server('3')], links: { next: null } },
			],
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect((outputs?.[0]?.json.data as Array<{ id: string }>).map(({ id }) => id)).toEqual([
			'1',
			'2',
			'3',
		]);
		expect(outputs?.[0]?.json).not.toHaveProperty('links');
		expect(outputs?.[0]?.json.meta).toMatchObject({
			n8n: {
				representation: 'combined',
				pagesFetched: 3,
				limitApplied: null,
				truncated: false,
				sourcePageContext: [
					{ page: 1, links: expect.any(Object) },
					{ page: 2, links: expect.any(Object) },
					{ page: 3, links: { next: null } },
				],
			},
		});
		expect(mock.http.mock.calls[1]?.[1]).toMatchObject({
			url: 'https://api.battlemetrics.com/servers?page%5Boffset%5D=1',
		});
	});

	it('preserves relationships, page links/meta, and deduplicated included resources', async () => {
		const largeId = '999999999999999999999999999999999999999999';
		const game = { type: 'game', id: 'rust', attributes: { name: 'Synthetic Game' } };
		const mock = collectionContext(
			[{ returnAll: true }],
			[
				{
					data: [
						server(largeId, {
							relationships: { game: { data: { type: 'game', id: 'rust' } } },
						}),
					],
					included: [game],
					links: { self: '/servers', next: '/servers?page=2' },
					meta: { total: 2 },
					jsonapi: { version: '1.0' },
				},
				{
					data: [server('second')],
					included: [game],
					links: { next: null },
					meta: { page: 2 },
				},
			],
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect((outputs?.[0]?.json.data as Array<{ id: string }>)[0]?.id).toBe(largeId);
		expect((outputs?.[0]?.json.data as Array<Record<string, unknown>>)[0]).toHaveProperty(
			'relationships.game.data.id',
			'rust',
		);
		expect(outputs?.[0]?.json.included).toEqual([game]);
		expect(outputs?.[0]?.json.meta).toHaveProperty(
			'n8n.sourcePageContext.0.jsonapi.version',
			'1.0',
		);
	});

	it('handles an empty collection with missing or null next links', async () => {
		for (const document of [{ data: [] }, { data: [], links: { next: null } }]) {
			const mock = collectionContext([{ returnAll: true }], [document]);
			const [outputs] = await new BattleMetrics().execute.call(
				mock.value as unknown as IExecuteFunctions,
			);
			expect(outputs?.[0]?.json.data).toEqual([]);
			expect(mock.http).toHaveBeenCalledTimes(1);
		}
	});

	it('processes multiple input items with correct pairing', async () => {
		const mock = collectionContext(
			[
				{ returnAll: false, limit: 1 },
				{ returnAll: false, limit: 1 },
			],
			[{ data: [server('first')] }, { data: [server('second')] }],
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.map(({ pairedItem }) => pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(outputs?.map(({ json }) => (json.data as Array<{ id: string }>)[0]?.id)).toEqual([
			'first',
			'second',
		]);
	});

	it.each([0, 1.5, 10_001, '10'])('validates an invalid Limit before HTTP: %s', async (limit) => {
		const mock = collectionContext([{ returnAll: false, limit: limit as number }], []);
		await expect(
			new BattleMetrics().execute.call(mock.value as unknown as IExecuteFunctions),
		).rejects.toThrow('Limit must be an integer');
		expect(mock.http).not.toHaveBeenCalled();
	});

	it('continues with a classified paired error after a later-page failure', async () => {
		const mock = collectionContext(
			[{ returnAll: true }, { returnAll: true }],
			[
				{ data: [server('first-page')], links: { next: '/servers?page=2' } },
				{
					response: {
						statusCode: 503,
						body: { errors: [{ status: '503', title: 'Unavailable' }] },
					},
				},
				{ data: [server('second-input')] },
			],
			true,
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]).toMatchObject({
			json: {
				category: 'serverError',
				statusCode: 503,
				operation: 'Server: Get Many',
				itemIndex: 0,
			},
			pairedItem: { item: 0 },
		});
		expect(outputs?.[1]?.pairedItem).toEqual({ item: 1 });
		expect(mock.http).toHaveBeenCalledTimes(3);
	});

	it('rejects an unsafe next link and redacts token text with Continue On Fail', async () => {
		const token = 'synthetic-secret-never-visible';
		const mock = collectionContext(
			[{ returnAll: true }],
			[
				{
					data: [server('one')],
					links: { next: `https://example.com/servers?authorization=Bearer%20${token}` },
				},
			],
			true,
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]?.json.error).toContain('Unsafe pagination link');
		expect(JSON.stringify(outputs)).not.toContain(token);
		expect(mock.http).toHaveBeenCalledTimes(1);
	});

	it('does not follow a same-origin next link to another resource', async () => {
		const mock = collectionContext(
			[{ returnAll: true }],
			[{ data: [server('one')], links: { next: '/players?page=2' } }],
			true,
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]?.json.error).toContain('expected the /servers path');
		expect(mock.http).toHaveBeenCalledTimes(1);
	});
});
