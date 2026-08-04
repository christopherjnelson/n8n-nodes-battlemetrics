import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { BattleMetrics } from '../BattleMetrics.node';

function executionContext(ids: string[], continueOnFail = false) {
	const http = vi.fn(async (_credential: string, options: { url: string }) => {
		const segments = options.url.split('/');
		return {
			data: { type: 'server', id: segments[segments.length - 1] ?? '' },
			meta: { synthetic: true },
		};
	});
	const inputs: INodeExecutionData[] = ids.map((id) => ({ json: { source: id } }));
	return {
		http,
		value: {
			getCredentials: async () => ({ accessToken: 'synthetic-token' }),
			getInputData: () => inputs,
			getNodeParameter: (name: string, index: number) => {
				if (name === 'resource') return 'server';
				if (name === 'operation') return 'get';
				if (name === 'serverId') return ids[index];
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

describe('BattleMetrics node execution', () => {
	it('processes multiple input items with stable pairedItem links', async () => {
		const mock = executionContext(['first-id', 'second-id']);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(mock.http).toHaveBeenCalledTimes(2);
		expect(outputs?.map((output) => output.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
		expect(outputs?.map((output) => output.json.data)).toEqual([
			{ type: 'server', id: 'first-id' },
			{ type: 'server', id: 'second-id' },
		]);
	});

	it('preserves the complete raw JSON:API envelope', async () => {
		const mock = executionContext(['opaque-id']);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]?.json).toEqual({
			data: { type: 'server', id: 'opaque-id' },
			meta: { synthetic: true },
		});
	});

	it('performs no HTTP call after local validation failure', async () => {
		const mock = executionContext(['   ']);
		await expect(
			new BattleMetrics().execute.call(mock.value as unknown as IExecuteFunctions),
		).rejects.toThrow('Server ID is required');
		expect(mock.http).not.toHaveBeenCalled();
	});

	it('continues after failure with concise paired error output', async () => {
		const mock = executionContext(['', 'valid-id'], true);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(outputs?.[0]).toMatchObject({
			json: { error: 'Server ID is required', operation: 'Server: Get', itemIndex: 0 },
			pairedItem: { item: 0 },
		});
		expect(outputs?.[1]?.pairedItem).toEqual({ item: 1 });
	});

	it('does not leak a token in continue-on-fail output', async () => {
		const token = 'synthetic-secret-token';
		const mock = executionContext(['valid-id'], true);
		mock.http.mockRejectedValueOnce(new Error(`Bearer ${token}`) as never);
		const [outputs] = await new BattleMetrics().execute.call(
			mock.value as unknown as IExecuteFunctions,
		);
		expect(JSON.stringify(outputs)).not.toContain(token);
	});
});
