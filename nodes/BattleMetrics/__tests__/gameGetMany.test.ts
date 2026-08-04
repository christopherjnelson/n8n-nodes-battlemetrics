import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { BattleMetrics } from '../BattleMetrics.node';
import {
	LIVE_OBSERVED_GAME_CONTENT_TYPE,
	LIVE_OBSERVED_GAME_PAGINATION_QUERY_KEYS,
	sanitizedGamePageOne,
	sanitizedGamePageTwo,
} from './fixtures/liveObservedGame';

const game = (id: string, extra: Record<string, unknown> = {}) => ({ type: 'game', id, ...extra });

interface Parameters {
	returnAll: boolean;
	limit?: number;
}

function context(parameters: Parameters[], responses: unknown[], continueOnFail = false) {
	const http = vi.fn();
	for (const response of responses) {
		if (
			response instanceof Error ||
			(typeof response === 'object' && response && 'response' in response)
		) {
			http.mockRejectedValueOnce(response);
		} else http.mockResolvedValueOnce(response);
	}
	const inputs: INodeExecutionData[] = parameters.map((_, index) => ({ json: { input: index } }));
	return {
		http,
		value: {
			getCredentials: async () => ({ accessToken: 'synthetic-token' }),
			getInputData: () => inputs,
			getNodeParameter: (name: string, index: number) => {
				if (name === 'resource') return 'game';
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

describe('Game: Get Many', () => {
	it('uses the verified method, endpoint, credential, and content header without query parameters', async () => {
		const mock = context([{ returnAll: false, limit: 10 }], [{ data: [game('example-game')] }]);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(mock.http).toHaveBeenCalledWith('battleMetricsApi', {
			method: 'GET',
			url: 'https://api.battlemetrics.com/games',
			headers: {
				Accept: 'application/vnd.api+json',
				Authorization: 'Bearer synthetic-token',
			},
			timeout: 15000,
			json: true,
		});
		expect(mock.http.mock.calls[0]?.[1]).not.toHaveProperty('qs');
		expect(output?.[0]?.pairedItem).toEqual({ item: 0 });
	});

	it('preserves a one-page raw envelope and applies Limit exactly', async () => {
		const included = [{ type: 'publisher', id: 'example-publisher' }];
		const document = {
			data: [game('one'), game('two'), game('three')],
			included,
			links: { self: 'https://example.invalid/games', next: null },
			meta: { synthetic: true },
			jsonapi: { version: '1.0' },
		};
		const mock = context([{ returnAll: false, limit: 2 }], [document]);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]?.json).toEqual({ ...document, data: [game('one'), game('two')] });
		expect(mock.http).toHaveBeenCalledTimes(1);
	});

	it.each([1, 3, 5])('handles Limit %s relative to a three-item page', async (limit) => {
		const mock = context(
			[{ returnAll: false, limit }],
			[{ data: [game('one'), game('two'), game('three')], links: { next: null } }],
		);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect((output?.[0]?.json.data as unknown[]).length).toBe(Math.min(limit, 3));
	});

	it('handles an empty collection', async () => {
		const mock = context([{ returnAll: true }], [{ data: [], links: { next: null } }]);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]?.json).toEqual({ data: [], links: { next: null } });
	});

	it('matches the observed structure and keeps game IDs as exact strings', async () => {
		expect(LIVE_OBSERVED_GAME_CONTENT_TYPE).toBe('application/json');
		const mock = context([{ returnAll: false, limit: 1 }], [sanitizedGamePageOne]);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		const resource = (output?.[0]?.json.data as Array<Record<string, unknown>>)[0];
		expect(resource?.id).toBe('example-game');
		expect(resource).not.toHaveProperty('relationships');
		expect(Object.keys(resource?.attributes as object).sort()).toEqual([
			'maxPlayers24H',
			'maxPlayers30D',
			'maxPlayers7D',
			'metadata',
			'minPlayers24H',
			'minPlayers30D',
			'minPlayers7D',
			'name',
			'players',
			'playersByCountry',
			'servers',
			'serversByCountry',
		]);
		expect(output?.[0]?.json).not.toHaveProperty('included');
		expect(output?.[0]?.json).not.toHaveProperty('meta');
		expect(output?.[0]?.json).not.toHaveProperty('jsonapi');
	});

	it('follows verified absolute pagination and combines pages without root pagination links', async () => {
		const mock = context([{ returnAll: true }], [sanitizedGamePageOne, sanitizedGamePageTwo]);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect((output?.[0]?.json.data as Array<{ id: string }>).map(({ id }) => id)).toEqual([
			'example-game',
			'example-game-two',
		]);
		expect(output?.[0]?.json).not.toHaveProperty('links');
		expect(output?.[0]?.json).toHaveProperty('meta.n8n.pagesFetched', 2);
		const followed = new URL(mock.http.mock.calls[1]?.[1].url as string);
		expect(followed.pathname).toBe('/games');
		expect([...followed.searchParams.keys()].sort()).toEqual([
			...LIVE_OBSERVED_GAME_PAGINATION_QUERY_KEYS,
		]);
	});

	it('deduplicates included resources by exact type and ID while retaining relationships', async () => {
		const included = { type: 'publisher', id: 'same', attributes: { name: 'Example Publisher' } };
		const first = game('one', {
			relationships: { publisher: { data: { type: 'publisher', id: 'same' } } },
		});
		const mock = context(
			[{ returnAll: true }],
			[
				{ data: [first], included: [included], links: { next: '/games?page=2' } },
				{ data: [game('two')], included: [included], links: { next: null } },
			],
		);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]?.json.included).toEqual([included]);
		expect(output?.[0]?.json).toHaveProperty('data.0.relationships.publisher.data.id', 'same');
	});

	it('processes multiple inputs with paired output items', async () => {
		const mock = context(
			[
				{ returnAll: false, limit: 1 },
				{ returnAll: false, limit: 1 },
			],
			[{ data: [game('one')] }, { data: [game('two')] }],
		);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.map(({ pairedItem }) => pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
	});

	it.each([0, -1, 1.5, 10_001, '10'])('rejects invalid Limit before HTTP: %s', async (limit) => {
		const mock = context([{ returnAll: false, limit: limit as number }], []);
		await expect(
			new BattleMetrics().execute.call(mock.value as unknown as IExecuteFunctions),
		).rejects.toThrow('Limit must be an integer');
		expect(mock.http).not.toHaveBeenCalled();
	});

	it('emits a concise paired error with Continue On Fail', async () => {
		const mock = context(
			[{ returnAll: true }],
			[{ response: { statusCode: '503', body: { errors: [{ title: 'Unavailable' }] } } }],
			true,
		);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]).toMatchObject({
			json: { category: 'serverError', statusCode: 503, operation: 'Game: Get Many', itemIndex: 0 },
			pairedItem: { item: 0 },
		});
	});

	it.each([
		['https://example.com/games?authorization=Bearer%20synthetic-secret', 'Unsafe pagination link'],
		['/servers?page=2', 'expected the /games path'],
	])('fails closed on unsafe pagination %s', async (next, message) => {
		const mock = context([{ returnAll: true }], [{ data: [game('one')], links: { next } }], true);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]?.json.error).toContain(message);
		expect(JSON.stringify(output)).not.toContain('synthetic-secret');
		expect(mock.http).toHaveBeenCalledTimes(1);
	});

	it('rejects a repeated next link', async () => {
		const next = '/games?page=2';
		const mock = context(
			[{ returnAll: true }],
			[
				{ data: [game('one')], links: { next } },
				{ data: [game('two')], links: { next } },
			],
			true,
		);
		const [output] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(output?.[0]?.json.error).toContain('Repeated pagination link');
	});
});
