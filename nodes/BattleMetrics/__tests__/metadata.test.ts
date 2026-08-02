import { describe, expect, it } from 'vitest';
import { BattleMetricsApi } from '../../../credentials/BattleMetricsApi.credentials';
import packageJson from '../../../package.json';
import { BattleMetrics } from '../BattleMetrics.node';
import { BATTLEMETRICS_API_ORIGIN } from '../transport/constants';

describe('package and node metadata', () => {
	const node = new BattleMetrics();
	const credential = new BattleMetricsApi();
	it('uses the required node identity', () => {
		expect(node.description.displayName).toBe('BattleMetrics');
		expect(node.description.name).toBe('battleMetrics');
		expect(node.description.version).toBe(1);
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
				testedBy: 'battleMetricsApiCredentialTest',
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
				}),
			]),
		);
	});

	it('injects bearer authentication without exposing a base URL', () => {
		expect(credential.authenticate).toEqual(
			expect.objectContaining({
				properties: { headers: { Authorization: '=Bearer {{$credentials.accessToken}}' } },
			}),
		);
		expect(
			credential.properties.some((property) => property.name.toLowerCase().includes('url')),
		).toBe(false);
	});

	it('reports the credential-test limitation without fabricating an endpoint', async () => {
		const test = node.methods?.credentialTest?.battleMetricsApiCredentialTest;
		expect(test).toBeTypeOf('function');
		const result = await test?.call({} as never, {} as never);
		expect(result).toMatchObject({ status: 'Error' });
		expect(result?.message).toContain('Automatic validation is unavailable');
	});

	it('uses the fixed official origin', () => {
		expect(BATTLEMETRICS_API_ORIGIN).toBe('https://api.battlemetrics.com');
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
				credentials: ['dist/credentials/BattleMetricsApi.credentials.js'],
				nodes: ['dist/nodes/BattleMetrics/BattleMetrics.node.js'],
			}),
		);
	});

	it('has zero declared runtime dependencies', () => {
		expect('dependencies' in packageJson).toBe(false);
	});
});
