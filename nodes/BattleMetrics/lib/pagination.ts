import type { JsonApiDocument, JsonApiLink } from './jsonApi';
import type { JsonApiCollectionDocument } from './jsonApiValidation';
import {
	BATTLEMETRICS_API_ORIGIN,
	DEFAULT_MAX_ITEMS,
	DEFAULT_MAX_PAGES,
} from '../transport/constants';

export interface PaginationOptions {
	maxPages?: number;
	maxItems?: number;
	limit?: number;
}

export interface PaginationResult {
	documents: JsonApiCollectionDocument[];
	itemCount: number;
}

export class PaginationError extends Error {
	override readonly name = 'PaginationError';
}

export function sameOriginPaginationUrl(
	link: JsonApiLink,
	base = BATTLEMETRICS_API_ORIGIN,
): URL | null {
	if (link === null) return null;
	const href = typeof link === 'string' ? link : link.href;
	if (!URL.canParse(href, base)) {
		throw new PaginationError('Unsafe pagination link: malformed URL');
	}
	const url = new URL(href, base);
	const origin = new URL(base).origin;
	if (
		url.protocol !== 'https:' ||
		url.origin !== origin ||
		url.username !== '' ||
		url.password !== ''
	) {
		throw new Error('Unsafe pagination link: expected the BattleMetrics HTTPS origin');
	}
	return url;
}

function success(document: JsonApiDocument): JsonApiCollectionDocument {
	if ('errors' in document) throw new Error('Cannot paginate a JSON:API error document');
	if (!Array.isArray(document.data)) throw new Error('Pagination requires a collection document');
	return document as JsonApiCollectionDocument;
}

export async function collectPages(
	initial: JsonApiDocument,
	fetchNext: (url: URL) => Promise<JsonApiDocument>,
	options: PaginationOptions = {},
): Promise<PaginationResult> {
	const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
	const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
	const userLimit = options.limit ?? maxItems;
	if (!Number.isSafeInteger(maxPages) || maxPages < 1) throw new Error('Page cap must be positive');
	if (!Number.isSafeInteger(maxItems) || maxItems < 1) throw new Error('Item cap must be positive');
	if (!Number.isSafeInteger(userLimit) || userLimit < 1)
		throw new Error('User limit must be positive');

	const documents: JsonApiCollectionDocument[] = [];
	const seen = new Set<string>();
	let itemCount = 0;
	let current: JsonApiCollectionDocument = success(initial);

	for (;;) {
		documents.push(current);
		itemCount += current.data.length;
		if (options.limit !== undefined && itemCount >= userLimit) {
			return { documents, itemCount: userLimit };
		}
		if (itemCount > maxItems) throw new Error(`Pagination item cap exceeded (${maxItems})`);

		const next = sameOriginPaginationUrl(current.links?.next ?? null);
		if (next === null) return { documents, itemCount };
		if (itemCount === maxItems) throw new Error(`Pagination item cap exceeded (${maxItems})`);
		if (documents.length >= maxPages) throw new Error(`Pagination page cap exceeded (${maxPages})`);
		if (seen.has(next.href)) throw new Error('Repeated pagination link detected');
		seen.add(next.href);
		current = success(await fetchNext(next));
	}
}
