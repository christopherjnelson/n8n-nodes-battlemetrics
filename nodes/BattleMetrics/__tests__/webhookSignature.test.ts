/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/no-hardcoded-secrets -- Offline tests inspect local source and a published BattleMetrics signature test vector; these values are not credentials or packaged runtime code. */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	getSingleSignatureHeader,
	parseSignatureHeader,
	verifySignature,
} from '../lib/webhookSignature';

const OFFICIAL_TIMESTAMP = '1970-01-01T00:00:00.000Z';
const OFFICIAL_VECTOR_KEY = 'fd38838ffca5116a9024b5957571e07bce98b207fe123f286f6af494ac8e6e54';
const OFFICIAL_SIGNATURE = '4723360cfc233c2137ede9094bfb1b6d4b034d49a65bcb582acd725636ea6258';

function sign(body: Buffer, secret = 'unit-test-secret', timestamp = OFFICIAL_TIMESTAMP): string {
	return createHmac('sha256', secret).update(timestamp).update('.').update(body).digest('hex');
}

describe('BattleMetrics signature header', () => {
	it('finds one header case-insensitively', () => {
		expect(
			getSingleSignatureHeader({
				'X-Signature': `t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE}`,
			}),
		).toContain(OFFICIAL_SIGNATURE);
	});

	it.each([
		[{}, undefined, 'Missing signature header'],
		[{ 'x-signature': ['one', 'two'] }, undefined, 'Ambiguous signature header'],
		[
			{ 'x-signature': `t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE}` },
			['X-Signature', 'first', 'x-signature', 'second'],
			'Ambiguous signature header',
		],
	] as const)('rejects missing or multiple header values', (headers, rawHeaders, message) => {
		expect(() => getSingleSignatureHeader(headers, rawHeaders)).toThrow(message);
	});

	it('parses the documented components and harmless surrounding whitespace', () => {
		const parsed = parseSignatureHeader(` t=${OFFICIAL_TIMESTAMP} , s=${OFFICIAL_SIGNATURE} `);
		expect(parsed.timestamp).toBe(OFFICIAL_TIMESTAMP);
		expect(parsed.signature.toString('hex')).toBe(OFFICIAL_SIGNATURE);
	});

	it('accepts uppercase hexadecimal deliberately', () => {
		expect(
			parseSignatureHeader(`t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE.toUpperCase()}`)
				.signature,
		).toEqual(Buffer.from(OFFICIAL_SIGNATURE, 'hex'));
	});

	it.each([
		[`s=${OFFICIAL_SIGNATURE}`, 'Missing timestamp'],
		[`t=${OFFICIAL_TIMESTAMP}`, 'Missing signature'],
		[
			`t=${OFFICIAL_TIMESTAMP},t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE}`,
			'Duplicate timestamp',
		],
		[
			`t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE},s=${OFFICIAL_SIGNATURE}`,
			'Duplicate signature',
		],
		[`t=not-a-time,s=${OFFICIAL_SIGNATURE}`, 'Invalid signature timestamp'],
		[`t=2026-02-30T00:00:00.000Z,s=${OFFICIAL_SIGNATURE}`, 'Invalid signature timestamp'],
		[`t=${OFFICIAL_TIMESTAMP},s=xyz`, 'Invalid signature encoding'],
		[`t=${OFFICIAL_TIMESTAMP},s=abcd`, 'Invalid signature length'],
		[`t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE},v=1`, 'Unknown signature component'],
		[`t = ${OFFICIAL_TIMESTAMP}, s = ${OFFICIAL_SIGNATURE}`, 'Malformed signature header'],
	] as const)('rejects malformed header %# without exposing signatures', (header, message) => {
		try {
			parseSignatureHeader(header);
			throw new Error('Expected parsing to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe(message);
			expect((error as Error).message).not.toContain(OFFICIAL_SIGNATURE);
		}
	});
});

describe('BattleMetrics HMAC verification', () => {
	it('matches the public first-party BattleMetrics known-answer vector', () => {
		const parsed = parseSignatureHeader(`t=${OFFICIAL_TIMESTAMP},s=${OFFICIAL_SIGNATURE}`);
		expect(() =>
			verifySignature(Buffer.from('Hello world'), OFFICIAL_VECTOR_KEY, parsed),
		).not.toThrow();
	});

	it.each([
		['plain text', 'unit-test-secret'],
		['', 'unit-test-secret'],
		['Multibyte: 🦖 café 日本語', 'unit-test-secret'],
	] as const)('verifies exact UTF-8 bytes for %j', (text, secret) => {
		const body = Buffer.from(text);
		const parsed = parseSignatureHeader(`t=${OFFICIAL_TIMESTAMP},s=${sign(body, secret)}`);
		expect(() => verifySignature(body, secret, parsed)).not.toThrow();
	});

	it.each([
		[Buffer.from('{"a":1, "b":2}'), Buffer.from('{"a":1,"b":2}')],
		[Buffer.from('{"a":1,"b":2}'), Buffer.from('{"b":2,"a":1}')],
		[Buffer.from('Hello world'), Buffer.from('Hello world\n')],
		[Buffer.from('Hello world'), Buffer.from('Hello worle')],
	] as const)('rejects exact-body mutation %#', (signedBody, receivedBody) => {
		const parsed = parseSignatureHeader(`t=${OFFICIAL_TIMESTAMP},s=${sign(signedBody)}`);
		expect(() => verifySignature(receivedBody, 'unit-test-secret', parsed)).toThrow(
			'Invalid webhook signature',
		);
	});

	it('rejects the wrong secret without exposing either secret or signature', () => {
		const body = Buffer.from('Hello world');
		const signature = sign(body, 'right-secret');
		const parsed = parseSignatureHeader(`t=${OFFICIAL_TIMESTAMP},s=${signature}`);
		try {
			verifySignature(body, 'wrong-secret', parsed);
			throw new Error('Expected verification to fail');
		} catch (error) {
			expect((error as Error).message).toBe('Invalid webhook signature');
			expect((error as Error).message).not.toMatch(/right-secret|wrong-secret/);
			expect((error as Error).message).not.toContain(signature);
		}
	});

	it('uses the built-in constant-time comparison after an equal-length check', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'nodes/BattleMetrics/lib/webhookSignature.ts'),
			'utf8',
		);
		expect(source).toContain("from 'node:crypto'");
		expect(source).toContain('expected.length !== parsed.signature.length');
		expect(source).toContain('timingSafeEqual(expected, parsed.signature)');
	});
});
