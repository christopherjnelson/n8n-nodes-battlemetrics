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
		expect(workflowFiles).toEqual(['get-server.json', 'get-servers.json']);
	});

	it.each(workflows)('$name has an importable workflow structure', ({ workflow }) => {
		expect(workflow).toMatchObject({
			id: expect.stringMatching(/^phase1c/),
			active: false,
			nodes: expect.any(Array),
			connections: expect.any(Object),
			settings: expect.any(Object),
		});
		expect(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.manualTrigger')).toBe(true);
		expect(workflow.nodes.some((node) => node.type === 'n8n-nodes-base.stickyNote')).toBe(true);
	});

	it.each(workflows)(
		'$name references only the implemented BattleMetrics node operations',
		({ workflow }) => {
			const nodes = workflow.nodes.filter(
				(node) => node.type === 'n8n-nodes-battlemetrics.battleMetrics',
			);
			expect(nodes).toHaveLength(1);
			expect(nodes[0]).toMatchObject({
				typeVersion: 1,
				parameters: { resource: 'server', operation: expect.stringMatching(/^(get|getAll)$/) },
			});
		},
	);

	it.each(workflows)(
		'$name contains no credentials, execution data, or private values',
		({ workflow }) => {
			const serialized = JSON.stringify(workflow);
			expect(serialized).not.toMatch(/accessToken|Authorization|Bearer\s|executionData/i);
			expect(workflow).not.toHaveProperty('credentials');
			for (const node of workflow.nodes) expect(node).not.toHaveProperty('credentials');
		},
	);
});
