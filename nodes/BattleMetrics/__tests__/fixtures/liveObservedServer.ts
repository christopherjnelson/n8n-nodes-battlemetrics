import type { JsonApiSuccessDocument } from '../../lib/jsonApi';

// Sanitized structural fixtures derived from the subscribed read-only verification on 2026-08-04.
// All IDs and values are synthetic. Only member presence, key names, resource types, and link form
// reproduce the live observations; no live response body or private value is stored here.
export const LIVE_OBSERVED_SUCCESS_CONTENT_TYPE = 'application/json';
export const LIVE_OBSERVED_PAGINATION_QUERY_KEYS = ['page[key]', 'page[rel]'] as const;

const observedAttributeKeys = {
	address: 'example.invalid:28015',
	country: 'ZZ',
	createdAt: '2026-01-01T00:00:00.000Z',
	details: null,
	id: '12345678901234567890',
	ip: '192.0.2.1',
	location: null,
	maxPlayers: 100,
	name: 'Example Server',
	players: 0,
	port: 28015,
	portQuery: 28016,
	private: false,
	queryStatus: 'valid',
	rank: 1,
	status: 'online',
	updatedAt: '2026-01-01T00:01:00.000Z',
};

export const sanitizedSingleServerDocument: JsonApiSuccessDocument = {
	data: {
		type: 'server',
		id: '12345678901234567890',
		attributes: observedAttributeKeys,
		relationships: {
			game: { data: { type: 'game', id: 'synthetic-game' } },
		},
	},
	included: [],
};

export const sanitizedServerPageOne: JsonApiSuccessDocument = {
	data: [
		{
			type: 'server',
			id: '12345678901234567890',
			attributes: observedAttributeKeys,
			relationships: {
				game: { data: { type: 'game', id: 'synthetic-game' } },
				serverGroup: { data: null },
			},
		},
	],
	included: [],
	links: {
		next: 'https://api.battlemetrics.com/servers?page%5Bkey%5D=synthetic-key&page%5Brel%5D=next',
	},
};

export const sanitizedServerPageTwo: JsonApiSuccessDocument = {
	data: [
		{
			type: 'server',
			id: '12345678901234567891',
			attributes: {
				...observedAttributeKeys,
				id: '12345678901234567891',
				name: 'Example Server 2',
			},
			relationships: {
				game: { data: { type: 'game', id: 'synthetic-game' } },
			},
		},
	],
	included: [],
	links: {
		prev: 'https://api.battlemetrics.com/servers?page%5Bkey%5D=synthetic-key&page%5Brel%5D=prev',
		next: 'https://api.battlemetrics.com/servers?page%5Bkey%5D=synthetic-next&page%5Brel%5D=next',
	},
};
