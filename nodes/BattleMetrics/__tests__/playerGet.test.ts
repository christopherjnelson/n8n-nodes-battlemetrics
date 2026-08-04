import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { BattleMetrics } from '../BattleMetrics.node';
import { sanitizedSinglePlayerDocument } from './fixtures/liveObservedPlayer';

function playerContext(ids: string[], responses: unknown[], continueOnFail = false) {
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
	const inputs: INodeExecutionData[] = ids.map((id) => ({ json: { source: id } }));
	return {
		http,
		value: {
			getCredentials: async () => ({ accessToken: 'synthetic-token' }),
			getInputData: () => inputs,
			getNodeParameter: (name: string, index: number) => {
				if (name === 'resource') return 'player';
				if (name === 'operation') return 'get';
				if (name === 'playerId') return ids[index];
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

describe('Player: Get', () => {
	it('uses the verified encoded get-by-ID path and preserves an exact string ID', async () => {
		const playerId = '12345678901234567890/slash';
		const document = {
			...sanitizedSinglePlayerDocument,
			data: { ...sanitizedSinglePlayerDocument.data, id: playerId },
		};
		const mock = playerContext([playerId], [document]);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(mock.http).toHaveBeenCalledWith(
			'battleMetricsApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.battlemetrics.com/players/12345678901234567890%2Fslash',
			}),
		);
		expect(outputs?.[0]?.json.data).toHaveProperty('id', playerId);
		expect(outputs?.[0]?.pairedItem).toEqual({ item: 0 });
	});

	it('preserves the complete observed raw JSON:API envelope', async () => {
		const mock = playerContext(['12345678901234567890'], [sanitizedSinglePlayerDocument]);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]?.json).toEqual(sanitizedSinglePlayerDocument);
		expect(outputs?.[0]?.json).toMatchObject({
			data: {
				type: 'player',
				attributes: {
					name: 'Example Player',
					positiveMatch: false,
					private: false,
				},
			},
			included: [],
		});
	});

	it('processes multiple inputs with stable pairing', async () => {
		const first = { data: { type: 'player', id: 'first' } };
		const second = { data: { type: 'player', id: 'second' } };
		const mock = playerContext(['first', 'second'], [first, second]);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.map(({ pairedItem }) => pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(outputs?.map(({ json }) => json.data)).toEqual([first.data, second.data]);
	});

	it('rejects an empty Player ID before making an HTTP request', async () => {
		const mock = playerContext(['  '], []);
		await expect(
			new BattleMetrics().execute.call(mock.value as unknown as IExecuteFunctions),
		).rejects.toThrow('Player ID is required');
		expect(mock.http).not.toHaveBeenCalled();
	});

	it('rejects a malformed or wrong-type success envelope', async () => {
		for (const response of [{ data: [] }, { data: { type: 'server', id: 'synthetic' } }]) {
			const mock = playerContext(['synthetic'], [response]);
			await expect(
				new BattleMetrics().execute.call(mock.value as unknown as IExecuteFunctions),
			).rejects.toThrow();
		}
	});

	it('normalizes a missing player without retaining raw sensitive body values', async () => {
		const privateValue = 'private-player-value-must-not-appear';
		const mock = playerContext(
			['missing'],
			[
				{
					response: {
						statusCode: 404,
						body: {
							errors: [{ status: '404', title: 'Not found' }],
							privatePayload: privateValue,
						},
					},
				},
			],
			true,
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]).toMatchObject({
			json: {
				category: 'resourceNotFound',
				statusCode: 404,
				operation: 'Player: Get',
				itemIndex: 0,
			},
			pairedItem: { item: 0 },
		});
		expect(JSON.stringify(outputs)).not.toContain(privateValue);
	});

	it.each([
		[401, 'invalidCredential'],
		[403, 'permissionDenied'],
		[429, 'rateLimited'],
		[503, 'serverError'],
	])('classifies HTTP %s with Continue On Fail', async (statusCode, category) => {
		const mock = playerContext(
			['synthetic'],
			[{ response: { statusCode, body: { errors: [{ status: String(statusCode) }] } } }],
			true,
		);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]?.json).toMatchObject({ category, statusCode, operation: 'Player: Get' });
	});

	it('redacts credentials from Player errors', async () => {
		const token = 'synthetic-secret-token';
		const mock = playerContext(['synthetic'], [new Error(`Authorization: Bearer ${token}`)], true);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(JSON.stringify(outputs)).not.toContain(token);
	});
});
