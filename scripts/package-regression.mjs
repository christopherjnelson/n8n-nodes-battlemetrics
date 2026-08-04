#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'battlemetrics-package-regression-'));
const require = createRequire(import.meta.url);

function jsonFile(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function commandOutput(command, arguments_) {
	try {
		return execFileSync(command, arguments_, { encoding: 'utf8' });
	} catch (error) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'status' in error &&
			error.status === 0 &&
			'stdout' in error &&
			typeof error.stdout === 'string'
		) {
			return error.stdout;
		}
		throw error;
	}
}

try {
	execFileSync('pnpm', ['run', 'build'], { cwd: repository, stdio: 'inherit' });
	const sourceMetadata = jsonFile(join(repository, 'nodes/BattleMetrics/BattleMetrics.node.json'));
	const compiledMetadata = jsonFile(
		join(repository, 'dist/nodes/BattleMetrics/BattleMetrics.node.json'),
	);
	assert(
		JSON.stringify(sourceMetadata) === JSON.stringify(compiledMetadata),
		'Source and compiled codex metadata differ',
	);

	execFileSync('pnpm', ['pack', '--pack-destination', temporaryDirectory], {
		cwd: repository,
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	const tarballName = readdirSync(temporaryDirectory).find((name) => name.endsWith('.tgz'));
	assert(tarballName, 'pnpm pack did not report a tarball name');
	const tarballPath = join(temporaryDirectory, tarballName);
	const packedFiles = commandOutput('tar', ['-tzf', tarballPath])
		.trim()
		.split(/\r?\n/)
		.filter(Boolean);
	const packedMetadata = JSON.parse(
		commandOutput('tar', [
			'-xOf',
			tarballPath,
			'package/dist/nodes/BattleMetrics/BattleMetrics.node.json',
		]),
	);
	assert(
		packedMetadata.node === 'n8n-nodes-battlemetrics.battleMetrics',
		'Packed codex node is not fully qualified',
	);
	assert(
		JSON.stringify(packedMetadata.categories) === JSON.stringify(['Data & Storage', 'Development']),
		'Packed codex categories are not the supported expected values',
	);
	assert(
		!packedFiles.some((path) => /(^|\/)(?:\.env(?:\.|$)|coverage\/|\.git\/)/.test(path)),
		'Packed artifact contains a forbidden environment, coverage, or Git path',
	);

	const nodeModule = require(join(repository, 'dist/nodes/BattleMetrics/BattleMetrics.node.js'));
	const credentialModule = require(
		join(repository, 'dist/credentials/BattleMetricsApi.credentials.js'),
	);
	assert(typeof nodeModule.BattleMetrics === 'function', 'Compiled node export does not load');
	assert(
		typeof credentialModule.BattleMetricsApi === 'function',
		'Compiled credential export does not load',
	);

	console.log(
		JSON.stringify({
			result: 'PASS',
			packedFileCount: packedFiles.length,
			codexNode: packedMetadata.node,
			codexCategories: packedMetadata.categories,
			compiledNodeLoad: true,
			compiledCredentialLoad: true,
		}),
	);
} finally {
	rmSync(temporaryDirectory, { recursive: true, force: true });
}
