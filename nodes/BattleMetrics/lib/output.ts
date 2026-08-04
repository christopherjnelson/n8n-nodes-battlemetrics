import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { JsonApiDocument, JsonApiResource, JsonValue } from './jsonApi';
import type { JsonApiCollectionDocument } from './jsonApiValidation';
import type { BattleMetricsRequestError } from './errors';

export function rawEnvelopeOutput(
	document: JsonApiDocument,
	itemIndex: number,
): INodeExecutionData {
	return {
		json: document as unknown as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

function deduplicatedIncluded(documents: readonly JsonApiCollectionDocument[]): JsonApiResource[] {
	const included: JsonApiResource[] = [];
	const seen = new Set<string>();
	for (const document of documents) {
		for (const resource of document.included ?? []) {
			const key = JSON.stringify([resource.type, resource.id]);
			if (seen.has(key)) continue;
			seen.add(key);
			included.push(resource);
		}
	}
	return included;
}

export function combinedCollectionOutput(
	documents: readonly JsonApiCollectionDocument[],
	itemIndex: number,
	limit?: number,
): INodeExecutionData {
	const allData = documents.flatMap((document) => document.data);
	const data = limit === undefined ? allData : allData.slice(0, limit);
	const included = deduplicatedIncluded(documents);
	const sourcePageContext = documents.map((document, index) => ({
		page: index + 1,
		...(document.links === undefined ? {} : { links: document.links }),
		...(document.meta === undefined ? {} : { meta: document.meta }),
		...(document.jsonapi === undefined ? {} : { jsonapi: document.jsonapi }),
	})) as unknown as JsonValue[];
	const lastNext = documents[documents.length - 1]?.links?.next;
	const truncated = allData.length > data.length || (limit !== undefined && lastNext != null);
	const hasIncluded = documents.some((document) => document.included !== undefined);
	const document = {
		data,
		...(hasIncluded ? { included } : {}),
		meta: {
			n8n: {
				representation: 'combined',
				pagesFetched: documents.length,
				primaryResourcesReturned: data.length,
				limitApplied: limit ?? null,
				truncated,
				sourcePageContext,
			},
		},
	};

	return {
		json: document as unknown as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

export function collectionOutput(
	documents: readonly JsonApiCollectionDocument[],
	itemIndex: number,
	limit?: number,
): INodeExecutionData {
	if (documents.length !== 1) return combinedCollectionOutput(documents, itemIndex, limit);
	const source = documents[0];
	if (source === undefined) return combinedCollectionOutput(documents, itemIndex, limit);
	const data = limit === undefined ? source.data : source.data.slice(0, limit);
	return {
		json: { ...source, data } as unknown as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

export function errorOutput(
	error: BattleMetricsRequestError,
	operation: string,
	itemIndex: number,
): INodeExecutionData {
	return {
		json: {
			error: error.message,
			category: error.context.category,
			operation,
			itemIndex,
			...(error.context.statusCode === undefined ? {} : { statusCode: error.context.statusCode }),
			...(error.context.retryAfter === undefined ? {} : { retryAfter: error.context.retryAfter }),
		},
		pairedItem: { item: itemIndex },
	};
}
