#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'battlemetrics-package-regression-'));
const extractionDirectory = mkdtempSync(join(repository, '.package-regression-'));
const require = createRequire(import.meta.url);
const expectedCodexNode = 'n8n-nodes-battlemetrics.battleMetrics';
const expectedCategories = ['Data & Storage', 'Development'];
const expectedFilesAllowlist = [
	'dist',
	'examples',
	'README.md',
	'CHANGELOG.md',
	'LICENSE',
	'THIRD_PARTY_NOTICES.md',
	'SECURITY.md',
];

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
	const packedPackage = JSON.parse(
		commandOutput('tar', ['-xOf', tarballPath, 'package/package.json']),
	);
	assert(packedMetadata.node === expectedCodexNode, 'Packed codex node is not fully qualified');
	assert(
		JSON.stringify(packedMetadata.categories) === JSON.stringify(expectedCategories),
		'Packed codex categories are not the supported expected values',
	);
	assert(packedMetadata.nodeVersion === '1.0', 'Packed codex node version is not 1.0');
	assert(
		JSON.stringify(sourceMetadata) === JSON.stringify(packedMetadata),
		'Source and packed codex metadata differ',
	);
	assert(
		JSON.stringify(packedPackage.files) === JSON.stringify(expectedFilesAllowlist),
		'Package files allowlist changed unexpectedly',
	);
	assert(!('dependencies' in packedPackage), 'Packed package declares runtime dependencies');
	assert(
		packedPackage.n8n?.nodes?.[0] === 'dist/nodes/BattleMetrics/BattleMetrics.node.js',
		'Packed node export is incorrect',
	);
	assert(
		packedPackage.n8n?.credentials?.[0] === 'dist/credentials/BattleMetricsApi.credentials.js',
		'Packed credential export is incorrect',
	);
	assert(
		packedFiles.every(
			(path) =>
				path.startsWith('package/dist/') ||
				path.startsWith('package/examples/') ||
				[
					'package/package.json',
					'package/README.md',
					'package/CHANGELOG.md',
					'package/LICENSE',
					'package/THIRD_PARTY_NOTICES.md',
					'package/SECURITY.md',
				].includes(path),
		),
		'Packed artifact contains a path outside the allowlist',
	);
	assert(
		!packedFiles.some((path) =>
			/(^|\/)(?:\.env(?:\.|$)|coverage\/|\.git\/|__tests__\/|tests?\/|research\/|execution(?:s|-data|_data))/i.test(
				path,
			),
		),
		'Packed artifact contains a forbidden environment, test, research, or execution path',
	);

	commandOutput('tar', ['-xzf', tarballPath, '-C', extractionDirectory]);
	const extractedPackage = join(extractionDirectory, 'package');
	const nodeModule = require(
		join(extractedPackage, 'dist/nodes/BattleMetrics/BattleMetrics.node.js'),
	);
	const credentialModule = require(
		join(extractedPackage, 'dist/credentials/BattleMetricsApi.credentials.js'),
	);
	assert(typeof nodeModule.BattleMetrics === 'function', 'Compiled node export does not load');
	assert(
		typeof credentialModule.BattleMetricsApi === 'function',
		'Compiled credential export does not load',
	);
	const node = new nodeModule.BattleMetrics();
	const credential = new credentialModule.BattleMetricsApi();
	assert(node.description.version === 1, 'Packed node type version is not 1');
	assert(node.description.usableAsTool === true, 'Packed node is not usable as an AI tool');
	assert(credential.name === 'battleMetricsApi', 'Packed credential name is incorrect');
	assert(
		credential.displayName === 'BattleMetrics API',
		'Packed credential display name is incorrect',
	);
	assert(
		credential.properties?.some(
			(property) =>
				property.name === 'accessToken' &&
				property.required === true &&
				property.typeOptions?.password === true,
		),
		'Packed credential Access Token is not required and password-protected',
	);
	assert(
		node.description.credentials?.[0]?.testedBy === undefined,
		'Packed node exposes a credential test',
	);

	const exampleFiles = readdirSync(join(extractedPackage, 'examples'))
		.filter((name) => name.endsWith('.json'))
		.sort();
	assert(
		JSON.stringify(exampleFiles) === JSON.stringify(['get-server.json', 'get-servers.json']),
		'Packed examples are missing or unexpected',
	);
	for (const name of exampleFiles) {
		const workflow = jsonFile(join(extractedPackage, 'examples', name));
		const serialized = JSON.stringify(workflow);
		assert(
			workflow.nodes?.some((candidate) => candidate.type === expectedCodexNode),
			`${name} does not reference the package node type`,
		);
		assert(
			!workflow.nodes?.some((candidate) => candidate.credentials !== undefined),
			`${name} contains a credential reference`,
		);
		assert(
			!/accessToken|Authorization|Bearer\s|executionData/i.test(serialized),
			`${name} contains credential or execution data`,
		);
	}

	const compressedSize = statSync(tarballPath).size;
	const unpackedSize = packedFiles.reduce(
		(total, path) => total + statSync(join(extractionDirectory, path)).size,
		0,
	);
	const sha256 = createHash('sha256').update(readFileSync(tarballPath)).digest('hex');

	console.log(
		JSON.stringify({
			result: 'PASS',
			tarballName,
			packedFileCount: packedFiles.length,
			compressedSize,
			unpackedSize,
			sha256,
			codexNode: packedMetadata.node,
			codexCategories: packedMetadata.categories,
			compiledNodeLoad: true,
			compiledCredentialLoad: true,
		}),
	);
} finally {
	rmSync(temporaryDirectory, { recursive: true, force: true });
	rmSync(extractionDirectory, { recursive: true, force: true });
}
