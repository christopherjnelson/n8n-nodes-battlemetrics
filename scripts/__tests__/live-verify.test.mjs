import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	envelopeSummary,
	errorCategory,
	paginationTarget,
	publicResult,
	request,
} from '../live-verify.mjs';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('sanitized live verifier', () => {
	it('summarizes a representative server envelope without copying values', () => {
		const privateName = 'must-not-appear';
		const summary = envelopeSummary(
			{
				data: {
					type: 'server',
					id: '12345678901234567890',
					attributes: { name: privateName, address: 'example.invalid', players: null },
					relationships: { game: { data: { type: 'game', id: 'synthetic-game' } } },
				},
				included: [{ type: 'game', id: 'synthetic-game' }],
				links: { self: '/servers/synthetic' },
				meta: { synthetic: true },
				jsonapi: { version: '1.0' },
			},
			'single',
		);
		expect(summary).toMatchObject({
			valid: true,
			kind: 'single',
			resourceTypes: ['server'],
			attributeKeys: ['address', 'name', 'players'],
			relationshipKeys: ['game'],
		});
		expect(JSON.stringify(summary)).not.toContain(privateName);
		expect(JSON.stringify(summary)).not.toContain('12345678901234567890');
	});

	it.each([
		['/servers?page%5Boffset%5D=100', true, 'relative'],
		['https://api.battlemetrics.com/servers?page%5Boffset%5D=100', true, 'absolute'],
		['https://example.com/servers?page=2', false, 'absolute'],
		['https://api.battlemetrics.com/players?page=2', false, 'absolute'],
	])('classifies pagination target %s', (link, safe, form) => {
		expect(paginationTarget(link)).toMatchObject({ presence: 'present', safe, form });
	});

	it.each([
		[401, { errors: [{ detail: 'Invalid token' }] }, 'invalidCredential'],
		[403, { errors: [{ detail: 'A subscription is required' }] }, 'subscriptionRequired'],
		[403, { errors: [{ detail: 'Forbidden' }] }, 'permissionDenied'],
		[404, { errors: [{ detail: 'Missing' }] }, 'resourceNotFound'],
	])('normalizes status %s without relying on exact wording', (status, document, category) => {
		expect(errorCategory(status, document)).toBe(category);
	});

	it('removes the in-memory response document from visible output', () => {
		const token = 'synthetic-secret-token';
		const result = publicResult({
			label: 'negative check',
			passed: true,
			document: { errors: [{ detail: `Bearer ${token}` }] },
		});
		expect(JSON.stringify(result)).not.toContain(token);
		expect(result).not.toHaveProperty('document');
	});

	it('accepts the expected JSON:API media type and retains only a structural summary', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ data: [{ type: 'server', id: '12345678901234567890' }] }), {
					status: 200,
					headers: { 'content-type': 'application/vnd.api+json' },
				}),
			),
		);
		const result = await request(
			'Server Get Many page 1',
			'https://api.battlemetrics.com/servers',
			'synthetic-token-never-printed',
			'collection',
		);
		expect(result).toMatchObject({
			status: 200,
			jsonMediaType: true,
			jsonApiMediaType: true,
			passed: true,
			envelope: { kind: 'collection', allIdsAreExactStrings: true },
		});
		expect(JSON.stringify(publicResult(result))).not.toContain('synthetic-token-never-printed');
	});
});
