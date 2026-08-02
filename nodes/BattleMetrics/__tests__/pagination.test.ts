import { describe, expect, it, vi } from 'vitest';
import { collectPages, sameOriginPaginationUrl } from '../lib/pagination';
import type { JsonApiDocument } from '../lib/jsonApi';

const resource = (id: string) => ({ type: 'server', id });

describe('pagination', () => {
	it('accepts absolute same-origin HTTPS next links', () => {
		expect(
			sameOriginPaginationUrl('https://api.battlemetrics.com/servers?page%5Boffset%5D=1')?.href,
		).toContain('api.battlemetrics.com/servers');
	});

	it('resolves relative next links', () => {
		expect(sameOriginPaginationUrl('/servers?page%5Boffset%5D=1')?.origin).toBe(
			'https://api.battlemetrics.com',
		);
	});

	it('accepts JSON:API link objects and null', () => {
		expect(sameOriginPaginationUrl({ href: '/servers?page=2' })?.pathname).toBe('/servers');
		expect(sameOriginPaginationUrl(null)).toBeNull();
	});

	it.each(['http://api.battlemetrics.com/servers', 'https://example.com/servers'])(
		'rejects unsafe origin %s',
		(link) => {
			expect(() => sameOriginPaginationUrl(link)).toThrow('Unsafe pagination link');
		},
	);

	it('rejects same-host URLs containing user information', () => {
		expect(() =>
			sameOriginPaginationUrl('https://user:secret@api.battlemetrics.com/servers'),
		).toThrow('Unsafe pagination link');
	});

	it('rejects malformed links', () => {
		expect(() => sameOriginPaginationUrl('https://[malformed')).toThrow('malformed URL');
		expect(() => sameOriginPaginationUrl({} as never)).toThrow('malformed URL');
		expect(() => sameOriginPaginationUrl({ href: '' })).toThrow('malformed URL');
	});

	it('preserves API page and resource order', async () => {
		const fetchNext = vi.fn().mockResolvedValueOnce({
			data: [resource('3'), resource('4')],
			links: { next: null },
		});
		const result = await collectPages(
			{
				data: [resource('1'), resource('2')],
				links: { next: '/servers?page=2' },
			},
			fetchNext,
		);
		expect(result.documents.flatMap((document) => document.data.map((item) => item.id))).toEqual([
			'1',
			'2',
			'3',
			'4',
		]);
	});

	it('detects repeated next links', async () => {
		const page = { data: [resource('2')], links: { next: '/servers?page=2' } };
		await expect(
			collectPages({ data: [resource('1')], links: { next: '/servers?page=2' } }, async () => page),
		).rejects.toThrow('Repeated pagination link');
	});

	it('enforces the page cap', async () => {
		await expect(
			collectPages(
				{ data: [resource('1')], links: { next: '/servers?page=2' } },
				async () => ({ data: [resource('2')], links: { next: '/servers?page=3' } }),
				{ maxPages: 1 },
			),
		).rejects.toThrow('Pagination page cap exceeded');
	});

	it('enforces the item cap', async () => {
		await expect(
			collectPages(
				{ data: [resource('1')], links: { next: '/servers?page=2' } },
				async () => ({ data: [resource('2'), resource('3')], links: { next: null } }),
				{ maxItems: 2 },
			),
		).rejects.toThrow('Pagination item cap exceeded');
	});

	it('stops at a user limit', async () => {
		const fetchNext = vi.fn();
		const result = await collectPages(
			{ data: [resource('1'), resource('2')], links: { next: '/servers?page=2' } },
			fetchNext,
			{ limit: 2 },
		);
		expect(result.itemCount).toBe(2);
		expect(fetchNext).not.toHaveBeenCalled();
	});

	it.each([
		{ data: [] } as JsonApiDocument,
		{ data: [], links: {} } as JsonApiDocument,
		{ data: [], links: { next: null } } as JsonApiDocument,
	])('handles empty first pages and absent/null next links: %#', async (document) => {
		const fetchNext = vi.fn();
		const result = await collectPages(document, fetchNext);
		expect(result).toMatchObject({ itemCount: 0, documents: [document] });
		expect(fetchNext).not.toHaveBeenCalled();
	});

	it('propagates a later-page error', async () => {
		await expect(
			collectPages({ data: [resource('1')], links: { next: '/servers?page=2' } }, async () => {
				throw new Error('Synthetic later-page failure');
			}),
		).rejects.toThrow('Synthetic later-page failure');
	});

	it('rejects a malformed next link while collecting', async () => {
		await expect(
			collectPages({ data: [resource('1')], links: { next: 'https://[malformed' } }, async () => ({
				data: [],
			})),
		).rejects.toThrow('malformed URL');
	});
});
