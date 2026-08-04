import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const examplesDirectory = resolve(import.meta.dirname, '../../examples');
const workflowFiles = readdirSync(examplesDirectory)
	.filter((name) => name.endsWith('.json'))
	.sort();
const workflows = workflowFiles.map((name) => ({
	name,
	workflow: JSON.parse(readFileSync(resolve(examplesDirectory, name), 'utf8')),
}));

describe('example workflows', () => {
	it('provides the required examples as valid JSON', () => {
		expect(workflowFiles).toEqual([
			'get-games.json',
			'get-player.json',
			'get-server.json',
			'get-servers.json',
			'receive-battlemetrics-webhook.json',
		]);
	});

	it.each(workflows)('$name has an importable workflow structure', ({ workflow }) => {
		expect(workflow).toMatchObject({
			id: expect.stringMatching(/^phase(?:1[cde]|2a)/),
			active: false,
			nodes: expect.any(Array),
			connections: expect.any(Object),
			settings: expect.any(Object),
		});
		if (workflow.name.includes('signed BattleMetrics webhook')) {
			expect(
				workflow.nodes.some((node) => node.type === 'n8n-nodes-battlemetrics.battleMetricsTrigger'),
			).toBe(true);
		} else {
			expect(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.manualTrigger')).toBe(
				true,
			);
		}
		expect(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.stickyNote')).toBe(true);
	});

	it.each(workflows)(
		'$name references only the implemented BattleMetrics node operations',
		({ name, workflow }) => {
			if (name === 'receive-battlemetrics-webhook.json') {
				expect(
					workflow.nodes.filter(
						(node) => node.type === 'n8n-nodes-battlemetrics.battleMetricsTrigger',
					),
				).toEqual([expect.objectContaining({ typeVersion: 1, parameters: {} })]);
				return;
			}
			const nodes = workflow.nodes.filter(
				(node) => node.type === 'n8n-nodes-battlemetrics.battleMetrics',
			);
			expect(nodes).toHaveLength(1);
			expect(nodes[0]).toMatchObject({ typeVersion: 1 });
			if (name === 'get-games.json') {
				expect(nodes[0]?.parameters).toMatchObject({ resource: 'game', operation: 'getAll' });
			} else if (name === 'get-player.json') {
				expect(nodes[0]?.parameters).toEqual({
					resource: 'player',
					operation: 'get',
					playerId: '12345678901234567890',
				});
			} else {
				expect(nodes[0]?.parameters).toMatchObject({
					resource: 'server',
					operation: expect.stringMatching(/^(get|getAll)$/),
				});
			}
		},
	);

	it('uses only the approved synthetic Player identity', () => {
		const example = workflows.find(({ name }) => name === 'get-player.json')?.workflow;
		const serialized = JSON.stringify(example);
		expect(serialized).toContain('12345678901234567890');
		expect(serialized).not.toContain('00000000000000000');
	});

	it.each(workflows)(
		'$name contains no credentials, execution data, or private values',
		({ workflow }) => {
			const serialized = JSON.stringify(workflow);
			expect(serialized).not.toMatch(
				/accessToken|sharedSecret|X-Signature|Authorization|Bearer\s|executionData/i,
			);
			expect(workflow).not.toHaveProperty('credentials');
			for (const node of workflow.nodes) expect(node).not.toHaveProperty('credentials');
		},
	);
});
