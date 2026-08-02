import { describe, expect, it } from 'vitest';
import {
	requireCollection,
	requireSingleResource,
	validateJsonApiDocument,
} from '../lib/jsonApiValidation';

describe('JSON:API validation', () => {
	it('accepts a single resource', () => {
		const document = validateJsonApiDocument({
			data: { type: 'server', id: '900719925474099312345', attributes: { name: 'Synthetic' } },
		});
		expect(requireSingleResource(document, 'server').id).toBe('900719925474099312345');
	});

	it('accepts collections and empty collections', () => {
		expect(validateJsonApiDocument({ data: [] })).toEqual({ data: [] });
		expect(validateJsonApiDocument({ data: [{ type: 'game', id: 'synthetic-game' }] })).toEqual(
			expect.objectContaining({ data: expect.any(Array) }),
		);
	});

	it('accepts null data', () => {
		expect(validateJsonApiDocument({ data: null })).toEqual({ data: null });
	});

	it('preserves relationships', () => {
		const input = {
			data: {
				type: 'server',
				id: 'server-id',
				relationships: { game: { data: { type: 'game', id: 'game-id' } } },
			},
		};
		expect(validateJsonApiDocument(input)).toEqual(input);
	});

	it('preserves included resources, links, and meta', () => {
		const input = {
			data: [{ type: 'server', id: 'server-id' }],
			included: [{ type: 'game', id: 'game-id', attributes: { name: 'Synthetic' } }],
			links: { self: 'https://api.battlemetrics.com/servers' },
			meta: { total: 1 },
		};
		expect(validateJsonApiDocument(input)).toEqual(input);
	});

	it('accepts nullable attributes and sparse resources', () => {
		expect(
			validateJsonApiDocument({
				data: { type: 'server', id: 'server-id', attributes: { name: null } },
			}),
		).toEqual(expect.objectContaining({ data: expect.objectContaining({ id: 'server-id' }) }));
		expect(validateJsonApiDocument({ data: { type: 'server', id: 'server-id' } })).toBeTruthy();
	});

	it('accepts JSON:API error arrays', () => {
		const input = { errors: [{ status: '403', code: 'forbidden', title: 'Forbidden' }] };
		expect(validateJsonApiDocument(input)).toEqual(input);
	});

	it.each([
		null,
		{},
		{ data: [], errors: [] },
		{ data: { type: 'server', id: 123 } },
		{ data: { id: 'id-without-type' } },
		{ errors: {} },
		{ included: [] },
	])('rejects malformed envelope %#', (input) => {
		expect(() => validateJsonApiDocument(input)).toThrow('Malformed JSON:API envelope');
	});

	it('rejects the wrong expected resource type', () => {
		const document = validateJsonApiDocument({ data: { type: 'player', id: 'opaque' } });
		expect(() => requireSingleResource(document, 'server')).toThrow(
			'expected resource type server',
		);
	});

	it('requires a collection of the expected resource type', () => {
		const document = validateJsonApiDocument({
			data: [
				{ type: 'server', id: 'one' },
				{ type: 'server', id: 'two' },
			],
		});
		expect(requireCollection(document, 'server').data).toHaveLength(2);
		expect(() => requireCollection(validateJsonApiDocument({ data: null }), 'server')).toThrow(
			'expected a resource collection',
		);
		expect(() =>
			requireCollection(
				validateJsonApiDocument({ data: [{ type: 'player', id: 'one' }] }),
				'server',
			),
		).toThrow('expected every resource type to be server');
	});
});
