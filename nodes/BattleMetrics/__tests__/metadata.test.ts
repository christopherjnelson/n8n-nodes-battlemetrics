import { describe, expect, it } from 'vitest';
import { BattleMetricsApi } from '../../../credentials/BattleMetricsApi.credentials';
import packageJson from '../../../package.json';
import { BattleMetrics } from '../BattleMetrics.node';
import codexMetadata from '../BattleMetrics.node.json';
import { BATTLEMETRICS_API_ORIGIN } from '../transport/constants';

describe('package and node metadata', () => {
	const node = new BattleMetrics();
	const credential = new BattleMetricsApi();
	it('uses the required node identity', () => {
		expect(node.description.displayName).toBe('BattleMetrics');
		expect(node.description.name).toBe('battleMetrics');
		expect(node.description.version).toBe(1);
	});

	it('uses the fully qualified codex node and supported categories', () => {
		expect(codexMetadata.node).toBe('n8n-nodes-battlemetrics.battleMetrics');
		expect(codexMetadata.categories).toEqual(['Data & Storage', 'Development']);
		expect(codexMetadata.categories).not.toContain('Developer Tools');
	});

	it('supports standard Main input and output and AI tools', () => {
		expect(node.description.inputs).toEqual(['main']);
		expect(node.description.outputs).toEqual(['main']);
		expect(node.description.usableAsTool).toBe(true);
	});

	it('requires the BattleMetrics credential', () => {
		expect(node.description.credentials).toEqual([
			{
				name: 'battleMetricsApi',
				required: true,
			},
		]);
	});

	it('uses the required credential identity and secret field', () => {
		expect(credential.name).toBe('battleMetricsApi');
		expect(credential.displayName).toBe('BattleMetrics API');
		expect(credential.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					displayName: 'Access Token',
					name: 'accessToken',
					typeOptions: { password: true },
					required: true,
				}),
			]),
		);
		expect(credential.properties[0]?.description).toContain('cannot prevalidate');
		expect(credential.properties[0]?.description).toContain('eligible BattleMetrics subscription');
	});

	it('keeps the credential non-proxy so n8n cannot inject an arbitrary API call', () => {
		expect(credential).not.toHaveProperty('authenticate');
		expect(
			credential.properties.some((property) => property.name.toLowerCase().includes('url')),
		).toBe(false);
	});

	it('does not register a misleading credential test', () => {
		expect(node.description.credentials?.[0]).not.toHaveProperty('testedBy');
		expect(
			(node as unknown as { methods?: { credentialTest?: unknown } }).methods?.credentialTest,
		).toBeUndefined();
	});

	it('uses the fixed official origin', () => {
		expect(BATTLEMETRICS_API_ORIGIN).toBe('https://api.battlemetrics.com');
	});

	it('exposes only verified operations for Server, Game, and Player', () => {
		const operations = node.description.properties.filter(
			(property) => property.name === 'operation',
		);
		const serverOperation = operations.find((property) =>
			property.displayOptions?.show?.resource?.includes('server'),
		);
		const gameOperation = operations.find((property) =>
			property.displayOptions?.show?.resource?.includes('game'),
		);
		const playerOperation = operations.find((property) =>
			property.displayOptions?.show?.resource?.includes('player'),
		);
		expect(serverOperation?.options).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Get Many', value: 'getAll' })]),
		);
		expect(gameOperation?.options).toEqual([
			expect.objectContaining({ name: 'Get Many', value: 'getAll' }),
		]);
		expect(gameOperation?.options).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ value: 'get' })]),
		);
		expect(playerOperation?.options).toEqual([
			expect.objectContaining({ name: 'Get', value: 'get', action: 'Get a player' }),
		]);
		expect(node.description.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'returnAll', type: 'boolean' }),
				expect.objectContaining({ name: 'limit', type: 'number' }),
			]),
		);
		for (const unverified of ['search', 'game', 'country', 'region', 'status', 'sort', 'include']) {
			expect(node.description.properties.some((property) => property.name === unverified)).toBe(
				false,
			);
		}
	});

	it('describes Player Get precisely and exposes no sensitive or speculative fields', () => {
		const resources = node.description.properties.find((property) => property.name === 'resource');
		expect(resources?.options).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Player', value: 'player' })]),
		);
		const operation = node.description.properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('player'),
		);
		const option = Array.isArray(operation?.options) ? operation.options[0] : undefined;
		const description = option && 'description' in option ? option.description : '';
		expect(description).toContain('raw player envelope');
		expect(description).toContain('BattleMetrics Player ID');
		expect(description).toContain('does not search by display name or platform identifier');
		expect(description).toContain('eligible subscription');
		expect(description).toContain('minimize retention and forwarding');
		const playerId = node.description.properties.find((property) => property.name === 'playerId');
		expect(playerId).toMatchObject({
			displayName: 'Player ID',
			required: true,
			default: '',
			displayOptions: { show: { resource: ['player'], operation: ['get'] } },
		});
		expect(playerId?.description).toContain('not a player display name');
		expect(playerId?.description).toContain('Steam ID');
		expect(playerId?.description).toContain('server ID');
		for (const name of [
			'playerName',
			'searchText',
			'serverId',
			'identifier',
			'include',
			'notes',
			'flags',
			'sessions',
		]) {
			const field = node.description.properties.find(
				(property) =>
					property.name === name && property.displayOptions?.show?.resource?.includes('player'),
			);
			expect(field).toBeUndefined();
		}
	});

	it('explains the Server operations without speculative controls', () => {
		const property = (name: string) =>
			node.description.properties.find((candidate) => candidate.name === name);
		const operation = node.description.properties.find(
			(candidate) =>
				candidate.name === 'operation' &&
				candidate.displayOptions?.show?.resource?.includes('server'),
		);
		const options = Array.isArray(operation?.options) ? operation.options : [];
		const get = options.find((option) => 'value' in option && option.value === 'get');
		const getMany = options.find((option) => 'value' in option && option.value === 'getAll');
		const description = (option: (typeof options)[number] | undefined) =>
			option && 'description' in option ? option.description : undefined;
		expect(description(get)).toContain('raw server envelope');
		expect(description(get)).toContain('BattleMetrics server ID');
		expect(description(get)).toContain('eligible subscription');
		expect(description(getMany)).toContain("API's default ordering");
		expect(description(getMany)).toContain('no server-side filters');
		expect(description(getMany)).toContain('Limit trims locally');
		expect(description(getMany)).toContain('100-page and 10,000-item caps');
		expect(description(getMany)).toContain('eligible subscription');
		expect(property('serverId')).toMatchObject({ required: true, default: '' });
		expect(property('serverId')?.description).toContain(
			'not a server name, address, Steam ID, or game ID',
		);
		expect(property('returnAll')?.description).toBe(
			'Whether to return all results or only up to a given limit',
		);
		expect(property('limit')?.description).toBe('Max number of results to return');
	});

	it('describes Game Get Many and shows canonical controls only for that operation', () => {
		const resources = node.description.properties.find((property) => property.name === 'resource');
		expect(resources?.options).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Game', value: 'game' })]),
		);
		const operation = node.description.properties.find(
			(property) =>
				property.name === 'operation' && property.displayOptions?.show?.resource?.includes('game'),
		);
		const option = Array.isArray(operation?.options) ? operation.options[0] : undefined;
		expect(option).toMatchObject({
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many games',
		});
		expect(option && 'description' in option ? option.description : '').toContain(
			'no server-side parameters',
		);
		for (const name of ['returnAll', 'limit']) {
			const field = node.description.properties.find((property) => property.name === name);
			expect(field?.displayOptions?.show?.resource).toContain('game');
			expect(field?.displayOptions?.show?.operation).toEqual(['getAll']);
		}
	});

	it('has correct package metadata and exports', () => {
		expect(packageJson).toMatchObject({
			name: 'n8n-nodes-battlemetrics',
			version: '0.1.0',
			license: 'MIT',
		});
		expect(packageJson.n8n).toEqual(
			expect.objectContaining({
				n8nNodesApiVersion: 1,
				credentials: [
					'dist/credentials/BattleMetricsApi.credentials.js',
					'dist/credentials/BattleMetricsWebhook.credentials.js',
				],
				nodes: [
					'dist/nodes/BattleMetrics/BattleMetrics.node.js',
					'dist/nodes/BattleMetrics/BattleMetricsTrigger.node.js',
				],
			}),
		);
	});

	it('has zero declared runtime dependencies', () => {
		expect('dependencies' in packageJson).toBe(false);
	});
});
