#!/usr/bin/env node

const API_URL = 'https://api.battlemetrics.com/servers';
const token = process.env.BATTLEMETRICS_ACCESS_TOKEN?.trim();

if (!token) {
	console.error('Refusing live verification: BATTLEMETRICS_ACCESS_TOKEN is required.');
	process.exitCode = 1;
} else {
	await verify();
}

function safeHeader(value) {
	if (value === null) return undefined;
	return value.replace(/[^\x20-\x7E]/g, '').slice(0, 200);
}

function nextLinkForm(link) {
	if (link === undefined) return 'missing';
	if (link === null) return 'null';
	const href = typeof link === 'string' ? link : link?.href;
	if (typeof href !== 'string') return 'malformed';
	try {
		const parsed = new URL(href, API_URL);
		if (!URL.canParse(href)) return 'relative';
		return parsed.origin === new URL(API_URL).origin
			? 'absolute-same-origin'
			: 'absolute-other-origin';
	} catch {
		return 'malformed';
	}
}

function envelopeSummary(document) {
	if (typeof document !== 'object' || document === null || Array.isArray(document)) {
		return { kind: 'non-object' };
	}
	const data = document.data;
	const resources = Array.isArray(data) ? data : data == null ? [] : [data];
	return {
		kind: Array.isArray(data) ? 'collection' : data === null ? 'null-data' : 'single-or-missing',
		primaryResourceCount: resources.length,
		includedResourceCount: Array.isArray(document.included) ? document.included.length : 0,
		errorCount: Array.isArray(document.errors) ? document.errors.length : 0,
		hasRelationships: resources.some(
			(resource) =>
				typeof resource === 'object' && resource !== null && 'relationships' in resource,
		),
		hasMeta: typeof document.meta === 'object' && document.meta !== null,
		linkKeys:
			typeof document.links === 'object' && document.links !== null
				? Object.keys(document.links).sort()
				: [],
		nextLinkForm: nextLinkForm(document.links?.next),
	};
}

async function verify() {
	try {
		const response = await fetch(API_URL, {
			method: 'GET',
			headers: {
				Accept: 'application/vnd.api+json',
				Authorization: `Bearer ${token}`,
			},
			signal: AbortSignal.timeout(15_000),
		});
		const rateLimitHeaders = {};
		for (const name of [
			'ratelimit-limit',
			'ratelimit-remaining',
			'ratelimit-reset',
			'retry-after',
			'x-ratelimit-limit',
			'x-ratelimit-remaining',
			'x-ratelimit-reset',
		]) {
			const value = safeHeader(response.headers.get(name));
			if (value !== undefined) rateLimitHeaders[name] = value;
		}

		let document;
		let parseError = false;
		try {
			document = JSON.parse(await response.text());
		} catch {
			parseError = true;
		}

		console.log(
			JSON.stringify(
				{
					request: { method: 'GET', path: '/servers', readOnly: true },
					statusCode: response.status,
					contentType: safeHeader(response.headers.get('content-type')) ?? null,
					apiVersion: safeHeader(response.headers.get('api-version')) ?? null,
					rateLimitHeaders,
					parseError,
					envelope: parseError ? null : envelopeSummary(document),
				},
				null,
				2,
			),
		);
		if (!response.ok) process.exitCode = 2;
	} catch {
		console.error('Live verification request failed (timeout or network error).');
		process.exitCode = 1;
	}
}
