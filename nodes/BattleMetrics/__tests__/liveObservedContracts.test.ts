import { describe, expect, it, vi } from 'vitest';
import { normalizeError } from '../lib/errors';
import { combinedCollectionOutput } from '../lib/output';
import { collectPages, sameOriginPaginationUrl } from '../lib/pagination';
import {
	requireCollection,
	requireSingleResource,
	validateJsonApiDocument,
} from '../lib/jsonApiValidation';
import {
	LIVE_OBSERVED_PAGINATION_QUERY_KEYS,
	LIVE_OBSERVED_SUCCESS_CONTENT_TYPE,
	sanitizedServerPageOne,
	sanitizedServerPageTwo,
	sanitizedSingleServerDocument,
} from './fixtures/liveObservedServer';
import {
	PLAYER_LIVE_OBSERVED_SUCCESS_CONTENT_TYPE,
	sanitizedSinglePlayerDocument,
} from './fixtures/liveObservedPlayer';

describe('sanitized subscribed Server contracts', () => {
	it('preserves the live-observed single-resource structure and exact opaque ID', () => {
		const document = validateJsonApiDocument(sanitizedSingleServerDocument);
		const server = requireSingleResource(document, 'server');
		expect(server.id).toBe('12345678901234567890');
		expect(Object.keys(server.attributes ?? {}).sort()).toEqual([
			'address',
			'country',
			'createdAt',
			'details',
			'id',
			'ip',
			'location',
			'maxPlayers',
			'name',
			'players',
			'port',
			'portQuery',
			'private',
			'queryStatus',
			'rank',
			'status',
			'updatedAt',
		]);
		expect(Object.keys(server.relationships ?? {})).toEqual(['game']);
		expect(sanitizedSingleServerDocument).toMatchObject({ included: [] });
		expect(sanitizedSingleServerDocument).not.toHaveProperty('links');
		expect(sanitizedSingleServerDocument).not.toHaveProperty('meta');
		expect(sanitizedSingleServerDocument).not.toHaveProperty('jsonapi');
	});

	it('accepts the observed application/json success content type', () => {
		expect(LIVE_OBSERVED_SUCCESS_CONTENT_TYPE).toBe('application/json');
	});

	it('follows one absolute same-origin keyset page and combines envelopes', async () => {
		const first = requireCollection(validateJsonApiDocument(sanitizedServerPageOne), 'server');
		const second = requireCollection(validateJsonApiDocument(sanitizedServerPageTwo), 'server');
		const fetchNext = vi.fn().mockResolvedValue(second);
		const result = await collectPages(first, fetchNext, { limit: 2 });
		expect(fetchNext).toHaveBeenCalledTimes(1);
		const followed = fetchNext.mock.calls[0]?.[0] as URL;
		expect(followed.origin).toBe('https://api.battlemetrics.com');
		expect(followed.pathname).toBe('/servers');
		expect([...followed.searchParams.keys()].sort()).toEqual([
			...LIVE_OBSERVED_PAGINATION_QUERY_KEYS,
		]);
		const output = combinedCollectionOutput(result.documents, 0, 2);
		expect((output.json.data as Array<{ id: string }>).map(({ id }) => id)).toEqual([
			'12345678901234567890',
			'12345678901234567891',
		]);
		expect(output.json).toHaveProperty('meta.n8n.sourcePageContext.0.links.next');
		expect(output.json).toHaveProperty('meta.n8n.pagesFetched', 2);
	});

	it('recognizes the directly observed absolute pagination target', () => {
		const next = sanitizedServerPageOne.links?.next;
		const url = sameOriginPaginationUrl(next ?? null);
		expect(url).toMatchObject({
			protocol: 'https:',
			hostname: 'api.battlemetrics.com',
			pathname: '/servers',
		});
	});

	it('normalizes the subscribed missing-server response as resourceNotFound', () => {
		const normalized = normalizeError(
			{
				response: {
					statusCode: 404,
					body: { errors: [{ status: '404', title: 'Synthetic missing resource' }] },
				},
			},
			{ operation: 'Server: Get', itemIndex: 0 },
		);
		expect(normalized.context.category).toBe('resourceNotFound');
	});
});

describe('sanitized subscribed Player contract', () => {
	it('preserves the live-observed single-resource structure and exact opaque ID', () => {
		const document = validateJsonApiDocument(sanitizedSinglePlayerDocument);
		const player = requireSingleResource(document, 'player');
		expect(player.id).toBe('12345678901234567890');
		expect(Object.keys(player.attributes ?? {}).sort()).toEqual([
			'createdAt',
			'id',
			'name',
			'positiveMatch',
			'private',
			'updatedAt',
		]);
		expect(Object.keys(player.relationships ?? {})).toEqual([]);
		expect(sanitizedSinglePlayerDocument).toMatchObject({ included: [] });
		expect(sanitizedSinglePlayerDocument).not.toHaveProperty('links');
		expect(sanitizedSinglePlayerDocument).not.toHaveProperty('meta');
		expect(sanitizedSinglePlayerDocument).not.toHaveProperty('jsonapi');
	});

	it('accepts the observed Player success content type', () => {
		expect(PLAYER_LIVE_OBSERVED_SUCCESS_CONTENT_TYPE).toBe('application/json');
	});

	it('normalizes the observed missing-player shape as resourceNotFound', () => {
		const normalized = normalizeError(
			{
				response: {
					statusCode: 404,
					body: { errors: [{ status: '404', title: 'Synthetic missing resource' }] },
				},
			},
			{ operation: 'Player: Get', itemIndex: 0 },
		);
		expect(normalized.context.category).toBe('resourceNotFound');
	});
});
