import type { JsonApiSuccessDocument } from '../../lib/jsonApi';

// Sanitized structural fixtures derived from the subscribed read-only verification on 2026-08-04.
// Values and pagination cursors are synthetic. Only observed member presence, key names, resource
// types, and pagination form are represented; no live response body is stored here.
export const LIVE_OBSERVED_GAME_CONTENT_TYPE = 'application/json';
export const LIVE_OBSERVED_GAME_PAGINATION_QUERY_KEYS = ['page[key]', 'page[rel]'] as const;

const observedAttributes = {
	maxPlayers24H: 100,
	maxPlayers30D: 300,
	maxPlayers7D: 200,
	metadata: {},
	minPlayers24H: 1,
	minPlayers30D: 1,
	minPlayers7D: 1,
	name: 'Example Game',
	players: 10,
	playersByCountry: {},
	servers: 2,
	serversByCountry: {},
};

export const sanitizedGamePageOne: JsonApiSuccessDocument = {
	data: [{ type: 'game', id: 'example-game', attributes: observedAttributes }],
	links: {
		next: 'https://api.battlemetrics.com/games?page%5Bkey%5D=synthetic-key&page%5Brel%5D=next',
	},
};

export const sanitizedGamePageTwo: JsonApiSuccessDocument = {
	data: [
		{
			type: 'game',
			id: 'example-game-two',
			attributes: { ...observedAttributes, name: 'Example Game 2' },
		},
	],
	links: {
		prev: 'https://api.battlemetrics.com/games?page%5Bkey%5D=synthetic-key&page%5Brel%5D=prev',
		next: null,
	},
};
