import { describe, expect, it } from 'vitest';
import { parseVerifiedBody } from '../lib/webhookBody';

describe('verified BattleMetrics webhook body parsing', () => {
	it.each([
		['{"event":"server.update"}', { event: 'server.update' }],
		['[1,"two"]', [1, 'two']],
		['"value"', 'value'],
		['42', 42],
		['true', true],
		['null', null],
	] as const)('parses every JSON value shape from raw bytes', (source, expected) => {
		expect(parseVerifiedBody(Buffer.from(source), 'application/json; charset=utf-8')).toEqual({
			body: expected,
			contentType: 'application/json',
		});
	});

	it('preserves plain text exactly after UTF-8 decoding', () => {
		const text = '  hello 🦖\n';
		expect(parseVerifiedBody(Buffer.from(text), 'Text/Plain; Charset="UTF-8"')).toEqual({
			body: text,
			contentType: 'text/plain',
		});
	});

	it.each([undefined, 'application/xml', 'application/json; charset=latin1', 'text/plain; x=y'])(
		'rejects unsupported media type %j',
		(contentType) => {
			expect(() => parseVerifiedBody(Buffer.from('{}'), contentType)).toThrow(
				'Unsupported media type',
			);
		},
	);

	it('rejects malformed JSON without including its body', () => {
		const body = '{"private":"do-not-reflect"';
		try {
			parseVerifiedBody(Buffer.from(body), 'application/json');
			throw new Error('Expected parsing to fail');
		} catch (error) {
			expect((error as Error).message).toBe('Malformed JSON request body');
			expect((error as Error).message).not.toContain(body);
		}
	});

	it('rejects invalid UTF-8', () => {
		expect(() => parseVerifiedBody(Buffer.from([0xc3, 0x28]), 'text/plain')).toThrow(
			'Invalid UTF-8 request body',
		);
	});
});
