#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const API_ORIGIN = 'https://api.battlemetrics.com';
const SERVERS_URL = `${API_ORIGIN}/servers`;
const GAMES_URL = `${API_ORIGIN}/games`;
const JSON_API_MEDIA_TYPE = 'application/vnd.api+json';
const TIMEOUT_MS = 15_000;
const SYNTHETIC_INVALID_TOKEN = 'phase-1b-synthetic-invalid-token';
const SYNTHETIC_MISSING_SERVER_ID = '0';

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	const token = process.env.BATTLEMETRICS_ACCESS_TOKEN?.trim();
	const serverId = process.env.BATTLEMETRICS_SERVER_ID?.trim();

	if (!token) {
		console.error('Refusing live verification: BATTLEMETRICS_ACCESS_TOKEN must be non-empty.');
		process.exitCode = 1;
	} else if (token === SYNTHETIC_INVALID_TOKEN) {
		console.error(
			'Refusing live verification: the configured token matches the synthetic negative-test token.',
		);
		process.exitCode = 1;
	} else {
		await verify(token, serverId);
	}
}

function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortedKeys(value) {
	return isRecord(value) ? Object.keys(value).sort() : [];
}

function safeHeader(value) {
	if (value === null) return undefined;
	return value.replace(/[^\x20-\x7E]/g, '').slice(0, 200);
}

function numericHeader(value) {
	const safe = safeHeader(value);
	return safe !== undefined && /^\d+(?:\.\d+)?$/.test(safe) ? safe : undefined;
}

function responseHeaders(headers) {
	const numeric = {};
	for (const name of [
		'age',
		'ratelimit-limit',
		'ratelimit-remaining',
		'ratelimit-reset',
		'x-ratelimit-limit',
		'x-ratelimit-remaining',
		'x-ratelimit-reset',
	]) {
		const value = numericHeader(headers.get(name));
		if (value !== undefined) numeric[name] = value;
	}
	const retryAfter = safeHeader(headers.get('retry-after'));
	const cacheControl = safeHeader(headers.get('cache-control'));
	const cacheStatus = safeHeader(headers.get('cf-cache-status'));
	return {
		numeric,
		...(retryAfter === undefined ? {} : { retryAfter }),
		...(cacheControl === undefined ? {} : { cacheControl }),
		...(cacheStatus === undefined ? {} : { cacheStatus }),
		apiVersion: safeHeader(headers.get('api-version')) ?? null,
	};
}

function linkHref(link) {
	if (typeof link === 'string') return link;
	return isRecord(link) && typeof link.href === 'string' ? link.href : undefined;
}

function paginationTarget(link, expectedPath = '/servers') {
	if (link === undefined) return { presence: 'missing' };
	if (link === null) return { presence: 'null' };
	const href = linkHref(link);
	if (href === undefined || !URL.canParse(href, SERVERS_URL)) {
		return { presence: 'present', form: 'malformed', safe: false };
	}
	const url = new URL(href, SERVERS_URL);
	const absolute = URL.canParse(href);
	const safe =
		url.protocol === 'https:' &&
		url.origin === API_ORIGIN &&
		url.pathname === expectedPath &&
		url.username === '' &&
		url.password === '';
	return {
		presence: 'present',
		form: absolute ? 'absolute' : 'relative',
		originValid: url.origin === API_ORIGIN,
		pathValid: url.pathname === expectedPath,
		queryParameterNames: [...new Set(url.searchParams.keys())].sort(),
		safe,
	};
}

function resourceSummary(resource) {
	if (!isRecord(resource)) return { valid: false };
	return {
		valid: typeof resource.type === 'string' && typeof resource.id === 'string',
		type: typeof resource.type === 'string' ? resource.type : null,
		idIsExactString: typeof resource.id === 'string',
		attributeKeys: sortedKeys(resource.attributes),
		relationshipKeys: sortedKeys(resource.relationships),
		linkKeys: sortedKeys(resource.links),
	};
}

function envelopeSummary(document, expectedKind, expectedPath = '/servers') {
	if (!isRecord(document)) return { valid: false, reason: 'top-level value is not an object' };
	const hasData = Object.hasOwn(document, 'data');
	const hasErrors = Object.hasOwn(document, 'errors');
	if (hasData === hasErrors) {
		return { valid: false, reason: 'expected exactly one of data or errors' };
	}
	if (hasErrors) {
		return {
			valid: Array.isArray(document.errors),
			kind: 'error',
			errorCount: Array.isArray(document.errors) ? document.errors.length : null,
			topLevelKeys: sortedKeys(document),
		};
	}
	const isCollection = Array.isArray(document.data);
	const resources = isCollection ? document.data : document.data === null ? [] : [document.data];
	const resourceSummaries = resources.map(resourceSummary);
	const resourceTypes = [
		...new Set(resourceSummaries.map(({ type }) => type).filter(Boolean)),
	].sort();
	const attributeKeys = [
		...new Set(resourceSummaries.flatMap(({ attributeKeys = [] }) => attributeKeys)),
	].sort();
	const relationshipKeys = [
		...new Set(resourceSummaries.flatMap(({ relationshipKeys = [] }) => relationshipKeys)),
	].sort();
	const kind = isCollection ? 'collection' : document.data === null ? 'null' : 'single';
	return {
		valid:
			(expectedKind === undefined || kind === expectedKind) &&
			resourceSummaries.every(({ valid }) => valid),
		kind,
		primaryResourceCount: resources.length,
		resourceTypes,
		allIdsAreExactStrings: resourceSummaries.every(({ idIsExactString }) => idIsExactString),
		attributeKeys,
		relationshipKeys,
		included: {
			present: Object.hasOwn(document, 'included'),
			shape: Array.isArray(document.included)
				? 'array'
				: document.included === undefined
					? 'missing'
					: 'other',
			resourceTypes: Array.isArray(document.included)
				? [
						...new Set(document.included.map((item) => resourceSummary(item).type).filter(Boolean)),
					].sort()
				: [],
		},
		links: {
			present: Object.hasOwn(document, 'links'),
			shape: isRecord(document.links)
				? 'object'
				: document.links === undefined
					? 'missing'
					: 'other',
			keys: sortedKeys(document.links),
			next: paginationTarget(document.links?.next, expectedPath),
		},
		meta: {
			present: Object.hasOwn(document, 'meta'),
			shape: isRecord(document.meta) ? 'object' : document.meta === undefined ? 'missing' : 'other',
			keys: sortedKeys(document.meta),
		},
		jsonapi: {
			present: Object.hasOwn(document, 'jsonapi'),
			shape: isRecord(document.jsonapi)
				? 'object'
				: document.jsonapi === undefined
					? 'missing'
					: 'other',
			keys: sortedKeys(document.jsonapi),
		},
		topLevelKeys: sortedKeys(document),
	};
}

function errorCategory(status, document) {
	const safeParts = Array.isArray(document?.errors)
		? document.errors
				.slice(0, 3)
				.flatMap((error) =>
					isRecord(error)
						? ['code', 'title', 'detail']
								.map((key) => error[key])
								.filter((value) => typeof value === 'string')
						: [],
				)
		: [];
	const details = safeParts.join(' ');
	if (status === 401) return 'invalidCredential';
	if (status === 403)
		return /subscription/i.test(details) ? 'subscriptionRequired' : 'permissionDenied';
	if (status === 404) return 'resourceNotFound';
	return status >= 500 ? 'serverError' : 'requestFailed';
}

async function request(label, url, bearerToken, expectedKind, expectedPath = '/servers') {
	const started = performance.now();
	let response;
	try {
		response = await fetch(url, {
			method: 'GET',
			headers: { Accept: JSON_API_MEDIA_TYPE, Authorization: `Bearer ${bearerToken}` },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch {
		return { label, passed: false, failure: 'timeoutOrNetworkError' };
	}
	const timingMs = Math.round(performance.now() - started);
	const contentType = safeHeader(response.headers.get('content-type')) ?? null;
	const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
	const isJsonApi = mediaType === JSON_API_MEDIA_TYPE;
	const isJson = isJsonApi || mediaType === 'application/json' || mediaType?.endsWith('+json');
	let document;
	let parseError = false;
	try {
		document = JSON.parse(await response.text());
	} catch {
		parseError = true;
	}
	const envelope = parseError ? null : envelopeSummary(document, expectedKind, expectedPath);
	return {
		label,
		status: response.status,
		contentType,
		jsonMediaType: isJson,
		jsonApiMediaType: isJsonApi,
		timingMs,
		headers: responseHeaders(response.headers),
		parseError,
		envelope,
		category: response.ok ? null : errorCategory(response.status, document),
		passed: response.ok && isJson && !parseError && envelope?.valid === true,
		document,
	};
}

function publicResult(result, extra = {}) {
	const { document: _document, ...safe } = result;
	return { ...safe, ...extra };
}

async function verify(accessToken, configuredServerId) {
	const results = [];
	if (configuredServerId) {
		const get = await request(
			'Server Get',
			`${SERVERS_URL}/${encodeURIComponent(configuredServerId)}`,
			accessToken,
			'single',
		);
		const getIdMatches = get.document?.data?.id === configuredServerId;
		get.passed = get.passed && get.document?.data?.type === 'server' && getIdMatches;
		results.push(publicResult(get, { requestedIdMatches: getIdMatches }));
	}

	const collection = await request(
		'Server Get Many page 1',
		SERVERS_URL,
		accessToken,
		'collection',
	);
	const collectionTypesValid =
		Array.isArray(collection.document?.data) &&
		collection.document.data.every((resource) => resource?.type === 'server');
	collection.passed = collection.passed && collectionTypesValid;
	results.push(publicResult(collection, { resourceTypesValid: collectionTypesValid }));

	const next = collection.document?.links?.next;
	const nextTarget = paginationTarget(next);
	if (collection.passed && nextTarget.presence === 'present') {
		if (!nextTarget.safe) {
			results.push({
				label: 'Server Get Many page 2',
				passed: false,
				failure: 'unsafePaginationTarget',
			});
		} else {
			const nextUrl = new URL(linkHref(next), SERVERS_URL);
			const page2 = await request('Server Get Many page 2', nextUrl, accessToken, 'collection');
			const firstIds = new Set(
				Array.isArray(collection.document?.data)
					? collection.document.data
							.map((resource) => resource?.id)
							.filter((id) => typeof id === 'string')
					: [],
			);
			const duplicatePrimaryIds = Array.isArray(page2.document?.data)
				? page2.document.data.filter((resource) => firstIds.has(resource?.id)).length
				: null;
			const page2TypesValid =
				Array.isArray(page2.document?.data) &&
				page2.document.data.every((resource) => resource?.type === 'server');
			page2.passed = page2.passed && page2TypesValid && duplicatePrimaryIds === 0;
			results.push(
				publicResult(page2, {
					resourceTypesValid: page2TypesValid,
					duplicatePrimaryIdsAcrossAdjacentPages: duplicatePrimaryIds,
				}),
			);
		}
	} else {
		results.push({
			label: 'Server Get Many page 2',
			passed: collection.passed && ['missing', 'null'].includes(nextTarget.presence),
			skipped: true,
			reason: nextTarget.presence === 'present' ? 'page 1 failed' : 'no next link',
		});
	}

	const games = await request(
		'Game Get Many page 1',
		GAMES_URL,
		accessToken,
		'collection',
		'/games',
	);
	const gameTypesValid =
		Array.isArray(games.document?.data) &&
		games.document.data.every((resource) => resource?.type === 'game');
	games.passed = games.passed && gameTypesValid;
	results.push(publicResult(games, { resourceTypesValid: gameTypesValid }));

	const gamesNext = games.document?.links?.next;
	const gamesNextTarget = paginationTarget(gamesNext, '/games');
	if (games.passed && gamesNextTarget.presence === 'present') {
		if (!gamesNextTarget.safe) {
			results.push({
				label: 'Game Get Many page 2',
				passed: false,
				failure: 'unsafePaginationTarget',
			});
		} else {
			const nextUrl = new URL(linkHref(gamesNext), GAMES_URL);
			const page2 = await request(
				'Game Get Many page 2',
				nextUrl,
				accessToken,
				'collection',
				'/games',
			);
			const firstIds = new Set(
				games.document.data.map((resource) => resource?.id).filter((id) => typeof id === 'string'),
			);
			const duplicatePrimaryIds = Array.isArray(page2.document?.data)
				? page2.document.data.filter((resource) => firstIds.has(resource?.id)).length
				: null;
			const page2TypesValid =
				Array.isArray(page2.document?.data) &&
				page2.document.data.every((resource) => resource?.type === 'game');
			page2.passed = page2.passed && page2TypesValid && duplicatePrimaryIds === 0;
			results.push(
				publicResult(page2, {
					resourceTypesValid: page2TypesValid,
					duplicatePrimaryIdsAcrossAdjacentPages: duplicatePrimaryIds,
				}),
			);
		}
	} else {
		results.push({
			label: 'Game Get Many page 2',
			passed: games.passed && ['missing', 'null'].includes(gamesNextTarget.presence),
			skipped: true,
			reason: gamesNextTarget.presence === 'present' ? 'page 1 failed' : 'no next link',
		});
	}

	const invalidToken = await request(
		'Invalid token negative check',
		`${SERVERS_URL}/${encodeURIComponent(configuredServerId)}`,
		SYNTHETIC_INVALID_TOKEN,
	);
	invalidToken.passed =
		invalidToken.status === 401 &&
		invalidToken.category === 'invalidCredential' &&
		invalidToken.parseError === false &&
		invalidToken.envelope?.valid === true &&
		invalidToken.envelope?.kind === 'error';
	results.push(publicResult(invalidToken));

	if (configuredServerId) {
		const invalidId = await request(
			'Invalid server ID negative check',
			`${SERVERS_URL}/${SYNTHETIC_MISSING_SERVER_ID}`,
			accessToken,
		);
		invalidId.passed =
			invalidId.status === 404 &&
			invalidId.category === 'resourceNotFound' &&
			invalidId.parseError === false &&
			invalidId.envelope?.valid === true &&
			invalidId.envelope?.kind === 'error';
		results.push(publicResult(invalidId));
	}

	for (const result of results) console.log(JSON.stringify(result, null, 2));
	const passed = results.every((result) => result.passed === true);
	console.log(JSON.stringify({ overall: passed ? 'PASS' : 'FAIL', checks: results.length }));
	if (!passed) process.exitCode = 2;
}

export { envelopeSummary, errorCategory, paginationTarget, publicResult, request };
