import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const packageJson = JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8'));
const ci = readFileSync(resolve(repository, '.github/workflows/ci.yml'), 'utf8');
const releaseProcess = readFileSync(resolve(repository, 'docs/release-process.md'), 'utf8');
const security = readFileSync(resolve(repository, 'SECURITY.md'), 'utf8');
const triggerCodex = JSON.parse(
	readFileSync(resolve(repository, 'nodes/BattleMetrics/BattleMetricsTrigger.node.json'), 'utf8'),
);

describe('release-candidate configuration', () => {
	it('supports only the locally and CI-tested Node.js majors', () => {
		expect(packageJson.engines.node).toBe('^22.0.0 || ^24.0.0');
		expect(ci).toContain('node-version: [22, 24]');
	});

	it('keeps the host-provided workflow peer and zero runtime dependencies', () => {
		expect(packageJson.peerDependencies).toEqual({ 'n8n-workflow': '*' });
		expect(packageJson).not.toHaveProperty('dependencies');
	});

	it('uses the supported trigger codex identity and category', () => {
		expect(triggerCodex).toMatchObject({
			node: 'n8n-nodes-battlemetrics.battleMetricsTrigger',
			categories: ['Development'],
		});
	});

	it('keeps CI non-publishing and exercises npm dry-run packaging', () => {
		expect(ci).toContain('npm pack --dry-run');
		expect(ci).not.toMatch(/npm publish|id-token:\s*write|workflow_dispatch|release:/);
		expect(existsSync(resolve(repository, '.github/workflows/publish.yml'))).toBe(false);
	});

	it('documents immutable releases and all owner approval checkpoints', () => {
		expect(releaseProcess).toContain('annotated `v<version>` tag');
		expect(releaseProcess).toContain('never overwritten');
		expect(releaseProcess).toMatch(/never move, delete\/recreate, or force-push/i);
		expect(releaseProcess).toContain('under `next`');
		expect(releaseProcess).toContain('promotion to `latest`');
		expect(releaseProcess).toContain('GitHub Actions OIDC');
		for (const checkpoint of [1, 2, 3, 4, 5]) {
			expect(releaseProcess).toContain(`Owner approval checkpoint ${checkpoint}`);
		}
	});

	it('provides an interim private report path and planned GitHub transition', () => {
		expect(security).toContain('christopherjnelson@proton.me');
		expect(security).toContain('GitHub private vulnerability reporting');
		expect(security).toContain('Security → Report a vulnerability');
	});
});
