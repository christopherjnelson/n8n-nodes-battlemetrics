#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputArgumentIndex = process.argv.indexOf('--output-directory');
const manifestArgumentIndex = process.argv.indexOf('--manifest');
const retainedOutputRequested = outputArgumentIndex !== -1 || manifestArgumentIndex !== -1;
assertArgumentPair();
const temporaryDirectory =
	outputArgumentIndex === -1
		? mkdtempSync(join(tmpdir(), 'battlemetrics-package-regression-'))
		: resolve(repository, process.argv[outputArgumentIndex + 1]);
const manifestPath =
	manifestArgumentIndex === -1
		? undefined
		: resolve(repository, process.argv[manifestArgumentIndex + 1]);
const npmCacheDirectory = mkdtempSync(join(tmpdir(), 'battlemetrics-package-npm-cache-'));
const extractionDirectory = mkdtempSync(join(repository, '.package-regression-'));
const require = createRequire(import.meta.url);
const expectedCodexNode = 'n8n-nodes-battlemetrics.battleMetrics';
const expectedTriggerCodexNode = 'n8n-nodes-battlemetrics.battleMetricsTrigger';
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

function assertArgumentPair() {
	if (!retainedOutputRequested) return;
	if (
		outputArgumentIndex === -1 ||
		manifestArgumentIndex === -1 ||
		!process.argv[outputArgumentIndex + 1] ||
		!process.argv[manifestArgumentIndex + 1]
	) {
		throw new Error('--output-directory and --manifest must be supplied together');
	}
}

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

function filesRecursively(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? filesRecursively(path) : [path];
	});
}

try {
	mkdirSync(temporaryDirectory, { recursive: true });
	assert(
		!readdirSync(temporaryDirectory).some((name) => name.endsWith('.tgz')),
		'Output directory already contains an npm tarball',
	);
	execFileSync('pnpm', ['run', 'build'], { cwd: repository, stdio: 'inherit' });
	const sourceMetadata = jsonFile(join(repository, 'nodes/BattleMetrics/BattleMetrics.node.json'));
	const compiledMetadata = jsonFile(
		join(repository, 'dist/nodes/BattleMetrics/BattleMetrics.node.json'),
	);
	const sourceTriggerMetadata = jsonFile(
		join(repository, 'nodes/BattleMetrics/BattleMetricsTrigger.node.json'),
	);
	const compiledTriggerMetadata = jsonFile(
		join(repository, 'dist/nodes/BattleMetrics/BattleMetricsTrigger.node.json'),
	);
	assert(
		JSON.stringify(sourceMetadata) === JSON.stringify(compiledMetadata),
		'Source and compiled codex metadata differ',
	);
	assert(
		JSON.stringify(sourceTriggerMetadata) === JSON.stringify(compiledTriggerMetadata),
		'Source and compiled trigger codex metadata differ',
	);

	execFileSync('npm', ['pack', '--pack-destination', temporaryDirectory], {
		cwd: repository,
		env: { ...process.env, npm_config_cache: npmCacheDirectory },
		stdio: ['ignore', 'ignore', 'inherit'],
	});
	const tarballName = readdirSync(temporaryDirectory).find((name) => name.endsWith('.tgz'));
	assert(tarballName, 'npm pack did not create a tarball');
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
	const packedTriggerMetadata = JSON.parse(
		commandOutput('tar', [
			'-xOf',
			tarballPath,
			'package/dist/nodes/BattleMetrics/BattleMetricsTrigger.node.json',
		]),
	);
	assert(packedMetadata.node === expectedCodexNode, 'Packed codex node is not fully qualified');
	assert(
		JSON.stringify(packedMetadata.categories) === JSON.stringify(expectedCategories),
		'Packed codex categories are not the supported expected values',
	);
	assert(packedMetadata.nodeVersion === '1.0', 'Packed codex node version is not 1.0');
	assert(
		packedTriggerMetadata.node === expectedTriggerCodexNode,
		'Packed trigger codex node is not fully qualified',
	);
	assert(
		JSON.stringify(packedTriggerMetadata.categories) === JSON.stringify(['Development']),
		'Packed trigger codex categories are not the supported expected values',
	);
	assert(packedTriggerMetadata.nodeVersion === '1.0', 'Packed trigger node version is not 1.0');
	assert(
		JSON.stringify(sourceTriggerMetadata) === JSON.stringify(packedTriggerMetadata),
		'Source and packed trigger codex metadata differ',
	);
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
		JSON.stringify(packedPackage.n8n?.nodes) ===
			JSON.stringify([
				'dist/nodes/BattleMetrics/BattleMetrics.node.js',
				'dist/nodes/BattleMetrics/BattleMetricsTrigger.node.js',
			]),
		'Packed node export is incorrect',
	);
	assert(
		JSON.stringify(packedPackage.n8n?.credentials) ===
			JSON.stringify([
				'dist/credentials/BattleMetricsApi.credentials.js',
				'dist/credentials/BattleMetricsWebhook.credentials.js',
			]),
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
			/(^|\/)(?:\.env(?:\.|$)|coverage\/|\.git\/|__tests__\/|tests?\/|research\/|screenshots?\/|execution(?:s|-data|_data)|[^/]+\.(?:sqlite3?|db|png|jpe?g|webp)$)/i.test(
				path,
			),
		),
		'Packed artifact contains a forbidden environment, test, research, or execution path',
	);

	commandOutput('tar', ['-xzf', tarballPath, '-C', extractionDirectory]);
	const extractedPackage = join(extractionDirectory, 'package');
	const packedSecretPatterns = [
		/BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY/,
		/gh[pousr]_[A-Za-z0-9_]{20,}/,
		/npm_[A-Za-z0-9]{20,}/,
		/Authorization:\s*Bearer\s+[A-Za-z0-9_-]{12,}/i,
		/https?:\/\/[^\s"']+\/(?:webhook|webhook-test)\/[A-Za-z0-9_-]{8,}/i,
		/(?:rconPassword|RCON_PASSWORD|sharedSecret|accessToken)\s*[:=]\s*["'][^"']{12,}["']/,
	];
	for (const path of filesRecursively(extractedPackage)) {
		const content = readFileSync(path, 'utf8');
		assert(
			!packedSecretPatterns.some((pattern) => pattern.test(content)),
			'Packed artifact contains a generic credential, private key, or production webhook pattern',
		);
	}
	const nodeModule = require(
		join(extractedPackage, 'dist/nodes/BattleMetrics/BattleMetrics.node.js'),
	);
	const credentialModule = require(
		join(extractedPackage, 'dist/credentials/BattleMetricsApi.credentials.js'),
	);
	const triggerModule = require(
		join(extractedPackage, 'dist/nodes/BattleMetrics/BattleMetricsTrigger.node.js'),
	);
	const webhookCredentialModule = require(
		join(extractedPackage, 'dist/credentials/BattleMetricsWebhook.credentials.js'),
	);
	assert(typeof nodeModule.BattleMetrics === 'function', 'Compiled node export does not load');
	assert(
		typeof credentialModule.BattleMetricsApi === 'function',
		'Compiled credential export does not load',
	);
	assert(
		typeof triggerModule.BattleMetricsTrigger === 'function',
		'Compiled trigger export does not load',
	);
	assert(
		typeof webhookCredentialModule.BattleMetricsWebhook === 'function',
		'Compiled webhook credential export does not load',
	);
	const node = new nodeModule.BattleMetrics();
	const credential = new credentialModule.BattleMetricsApi();
	const trigger = new triggerModule.BattleMetricsTrigger();
	const webhookCredential = new webhookCredentialModule.BattleMetricsWebhook();
	assert(node.description.version === 1, 'Packed node type version is not 1');
	assert(node.description.usableAsTool === true, 'Packed node is not usable as an AI tool');
	assert(trigger.description.version === 1, 'Packed trigger node type version is not 1');
	assert(
		trigger.description.displayName === 'BattleMetrics Webhook Trigger' &&
			trigger.description.name === 'battleMetricsTrigger',
		'Packed trigger display or stable internal name changed unexpectedly',
	);
	assert(trigger.description.usableAsTool === undefined, 'Packed trigger is exposed as an AI tool');
	assert(
		trigger.description.credentials?.[0]?.name === 'battleMetricsWebhook',
		'Packed trigger credential is incorrect',
	);
	assert(
		trigger.description.webhooks?.[0]?.httpMethod === 'POST' &&
			trigger.description.webhooks?.[0]?.responseMode === 'onReceived',
		'Packed trigger webhook is not immediate POST',
	);
	assert(credential.name === 'battleMetricsApi', 'Packed credential name is incorrect');
	assert(
		credential.displayName === 'BattleMetrics API',
		'Packed credential display name is incorrect',
	);
	assert(
		webhookCredential.name === 'battleMetricsWebhook' &&
			webhookCredential.displayName === 'BattleMetrics Webhook',
		'Packed webhook credential identity is incorrect',
	);
	assert(
		webhookCredential.authenticate === undefined,
		'Packed webhook credential enables proxy authentication',
	);
	assert(
		webhookCredential.properties?.some(
			(property) =>
				property.name === 'sharedSecret' &&
				property.required === true &&
				property.typeOptions?.password === true,
		),
		'Packed webhook credential Shared Secret is not required and password-protected',
	);
	assert(
		credential.authenticate === undefined,
		'Packed credential enables n8n proxy authentication and arbitrary API-call injection',
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
	const resources = node.description.properties.find((property) => property.name === 'resource');
	const gameOperation = node.description.properties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes('game'),
	);
	assert(
		JSON.stringify(resources?.options?.map(({ value }) => value)) ===
			JSON.stringify(['game', 'player', 'server']),
		'Packed node resources are missing, unexpected, or unstable',
	);
	const playerOperation = node.description.properties.find(
		(property) =>
			property.name === 'operation' && property.displayOptions?.show?.resource?.includes('player'),
	);
	assert(
		JSON.stringify(playerOperation?.options?.map(({ value }) => value)) === JSON.stringify(['get']),
		'Packed Player operations are missing, unexpected, or unstable',
	);
	assert(
		JSON.stringify(gameOperation?.options?.map(({ value }) => value)) ===
			JSON.stringify(['getAll']),
		'Packed Game operations are missing, unexpected, or unstable',
	);

	const exampleFiles = readdirSync(join(extractedPackage, 'examples'))
		.filter((name) => name.endsWith('.json'))
		.sort();
	assert(
		JSON.stringify(exampleFiles) ===
			JSON.stringify([
				'get-games.json',
				'get-player.json',
				'get-server.json',
				'get-servers.json',
				'receive-battlemetrics-webhook.json',
			]),
		'Packed examples are missing or unexpected',
	);
	for (const name of exampleFiles) {
		const workflow = jsonFile(join(extractedPackage, 'examples', name));
		const serialized = JSON.stringify(workflow);
		assert(
			workflow.nodes?.some((candidate) =>
				[expectedCodexNode, expectedTriggerCodexNode].includes(candidate.type),
			),
			`${name} does not reference the package node type`,
		);
		assert(
			!workflow.nodes?.some((candidate) => candidate.credentials !== undefined),
			`${name} contains a credential reference`,
		);
		assert(
			!/accessToken|sharedSecret|X-Signature|Authorization|Bearer\s|executionData/i.test(
				serialized,
			),
			`${name} contains credential or execution data`,
		);
	}

	const compressedSize = statSync(tarballPath).size;
	const unpackedSize = packedFiles.reduce(
		(total, path) => total + statSync(join(extractionDirectory, path)).size,
		0,
	);
	const sha256 = createHash('sha256').update(readFileSync(tarballPath)).digest('hex');
	const packageResult = {
		result: 'PASS',
		packageName: packedPackage.name,
		packageVersion: packedPackage.version,
		tarballName,
		packedFileCount: packedFiles.length,
		compressedSize,
		unpackedSize,
		sha256,
		codexNode: packedMetadata.node,
		triggerCodexNode: packedTriggerMetadata.node,
		codexCategories: packedMetadata.categories,
		triggerCodexCategories: packedTriggerMetadata.categories,
		compiledNodeLoad: true,
		compiledCredentialLoad: true,
		compiledTriggerLoad: true,
		compiledWebhookCredentialLoad: true,
		packedSecretScan: true,
	};

	if (manifestPath) {
		const sourceCommit = process.env.RELEASE_SOURCE_COMMIT;
		const testCount = Number.parseInt(process.env.RELEASE_TEST_COUNT ?? '', 10);
		const nodeVersion = process.env.RELEASE_NODE_VERSION;
		const npmVersion = process.env.RELEASE_NPM_VERSION;
		const pnpmVersion = process.env.RELEASE_PNPM_VERSION;
		assert(/^[0-9a-f]{40}$/.test(sourceCommit ?? ''), 'Release source commit is not a full SHA');
		assert(Number.isSafeInteger(testCount) && testCount > 0, 'Release test count is invalid');
		assert(/^v24\./.test(nodeVersion ?? ''), 'Release Node.js version is not a 24.x release');
		assert(npmVersion === '11.16.0', 'Release npm version is not 11.16.0');
		assert(pnpmVersion === '11.15.0', 'Release pnpm version is not 11.15.0');
		assert(packedPackage.name === 'n8n-nodes-battlemetrics', 'Release package name changed');
		assert(packedPackage.version === '0.1.1', 'Release package version changed');
		const manifest = {
			schemaVersion: 1,
			...packageResult,
			intendedTag: `v${packedPackage.version}`,
			sourceCommit,
			testCount,
			runtimeDependencyCount: Object.keys(packedPackage.dependencies ?? {}).length,
			nodeVersion,
			npmVersion,
			pnpmVersion,
		};
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
	}

	console.log(JSON.stringify(packageResult));
} finally {
	if (!retainedOutputRequested) rmSync(temporaryDirectory, { recursive: true, force: true });
	rmSync(npmCacheDirectory, { recursive: true, force: true });
	rmSync(extractionDirectory, { recursive: true, force: true });
}
