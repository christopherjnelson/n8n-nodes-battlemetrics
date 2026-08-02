import { describe, expect, it } from 'vitest';
import {
	controlledEnum,
	isoDateTime,
	jsonApiResourceIdentifier,
	opaqueResourceId,
	optionalFilter,
	pageSize,
	positiveSafeInteger,
	requiredTrimmedString,
	validUrl,
} from '../lib/inputValidation';

describe('input validation', () => {
	it('requires strings', () => {
		expect(() => requiredTrimmedString(undefined, 'Name')).toThrow('Name is required');
	});

	it('rejects whitespace-only strings', () => {
		expect(() => requiredTrimmedString('   ', 'Name')).toThrow('Name is required');
	});

	it('trims required strings', () => {
		expect(requiredTrimmedString('  server  ', 'Name')).toBe('server');
	});

	it('keeps very large IDs as exact strings', () => {
		const id = '999999999999999999999999999999999999999999999999';
		expect(opaqueResourceId<'server'>(id, 'Server ID')).toBe(id);
	});

	it.each([0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, '1', null])(
		'rejects invalid positive integer %s',
		(value) => {
			expect(() => positiveSafeInteger(value, 'Limit')).toThrow(
				'Limit must be a positive safe integer',
			);
		},
	);

	it('accepts a positive safe integer', () => {
		expect(positiveSafeInteger(10, 'Limit')).toBe(10);
	});

	it('omits empty optional filters', () => {
		expect(optionalFilter('', 'Search')).toBeUndefined();
		expect(optionalFilter(undefined, 'Search')).toBeUndefined();
	});

	it('validates controlled enums', () => {
		expect(controlledEnum('name', ['name', 'createdAt'] as const, 'Sort')).toBe('name');
		expect(() => controlledEnum('secret', ['name'] as const, 'Sort')).toThrow();
	});

	it('caps page sizes', () => {
		expect(pageSize(25, 100)).toBe(25);
		expect(() => pageSize(101, 100)).toThrow('Page size must not exceed 100');
	});

	it('validates ISO date-times with timezones', () => {
		expect(isoDateTime('2026-08-02T12:00:00Z', 'Timestamp')).toBe('2026-08-02T12:00:00Z');
		expect(() => isoDateTime('2026-08-02', 'Timestamp')).toThrow();
		expect(() => isoDateTime('2026-99-99T12:00:00Z', 'Timestamp')).toThrow();
	});

	it('validates resource identifiers and their category', () => {
		expect(jsonApiResourceIdentifier<'server'>('server', 'opaque', 'server', 'Server ID')).toEqual({
			type: 'server',
			id: 'opaque',
		});
		expect(() =>
			jsonApiResourceIdentifier<'server'>('player', 'opaque', 'server', 'Server ID'),
		).toThrow('Resource type must be server');
	});

	it('validates URLs', () => {
		expect(validUrl('https://api.battlemetrics.com/servers').hostname).toBe(
			'api.battlemetrics.com',
		);
		expect(() => validUrl('not a url')).toThrow('URL must be a valid URL');
	});
});
