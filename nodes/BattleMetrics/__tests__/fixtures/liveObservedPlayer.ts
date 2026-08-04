import type { JsonApiSuccessDocument } from '../../lib/jsonApi';

// Sanitized structural fixture derived from the subscribed read-only verification on 2026-08-04.
// Every value is synthetic. Only member presence, key names, and resource types reproduce the live
// observation; no live response body or player identity is stored here.
export const PLAYER_LIVE_OBSERVED_SUCCESS_CONTENT_TYPE = 'application/json';

export const sanitizedSinglePlayerDocument: JsonApiSuccessDocument = {
	data: {
		type: 'player',
		id: '12345678901234567890',
		attributes: {
			createdAt: '2026-01-01T00:00:00.000Z',
			id: '12345678901234567890',
			name: 'Example Player',
			positiveMatch: false,
			private: false,
			updatedAt: '2026-01-01T00:01:00.000Z',
		},
	},
	included: [],
};
