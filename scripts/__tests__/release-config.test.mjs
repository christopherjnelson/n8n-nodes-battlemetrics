import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const packageJson = JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8'));
const ci = readFileSync(resolve(repository, '.github/workflows/ci.yml'), 'utf8');
const publish = readFileSync(resolve(repository, '.github/workflows/publish.yml'), 'utf8');
const releaseProcess = readFileSync(resolve(repository, 'docs/release-process.md'), 'utf8');
const security = readFileSync(resolve(repository, 'SECURITY.md'), 'utf8');
const triggerCodex = JSON.parse(
	readFileSync(resolve(repository, 'nodes/BattleMetrics/BattleMetricsTrigger.node.json'), 'utf8'),
);

describe('release-candidate configuration', () => {
	it('prepares the scanner remediation release as 0.1.2', () => {
		expect(packageJson.version).toBe('0.1.2');
	});

	it('supports only the locally and CI-tested Node.js majors', () => {
		expect(packageJson.engines.node).toBe('>=22.22.0');
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

	it('keeps ordinary CI non-publishing and exercises npm dry-run packaging', () => {
		expect(ci).toContain('npm pack --dry-run');
		expect(ci).not.toMatch(/npm publish|id-token:\s*write|workflow_dispatch|release:/);
	});

	it('preserves the proven tag-triggered Trusted Publisher workflow', () => {
		expect(existsSync(resolve(repository, '.github/workflows/release.yml'))).toBe(false);
		expect(publish).toMatch(/tags:\s*\n\s*- ['"]v\*\.\*\.\*['"]/);
		expect(publish).toMatch(/id-token:\s*write/);
		expect(publish).toContain('pnpm run release');
		expect(packageJson.scripts).toMatchObject({
			prepublishOnly: 'n8n-node prerelease',
			release: 'n8n-node release',
		});
		expect(publish).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN|environment:|npm stage/);
	});

	it('documents trusted publishing with immutable versions and tags', () => {
		expect(releaseProcess).toContain('annotated `v<version>` tag');
		expect(releaseProcess).toContain('npm Trusted Publisher');
		expect(releaseProcess).toContain('pnpm run release');
		expect(releaseProcess).toContain('GitHub release');
		expect(releaseProcess).toMatch(/never move or recreate a published tag/i);
	});

	it('provides an interim private report path and planned GitHub transition', () => {
		expect(security).toContain('christopherjnelson@proton.me');
		expect(security).toContain('GitHub private vulnerability reporting');
		expect(security).toContain('Security → Report a vulnerability');
	});
});
