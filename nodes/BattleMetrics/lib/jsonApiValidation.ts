import type {
	JsonApiDocument,
	JsonApiError,
	JsonApiResource,
	JsonApiResourceIdentifier,
	JsonApiSuccessDocument,
} from './jsonApi';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIdentifier(value: unknown): value is JsonApiResourceIdentifier {
	return isRecord(value) && typeof value.type === 'string' && typeof value.id === 'string';
}

function isResource(value: unknown): value is JsonApiResource {
	return isIdentifier(value);
}

function isError(value: unknown): value is JsonApiError {
	if (!isRecord(value)) return false;
	return ['id', 'status', 'code', 'title', 'detail'].every(
		(key) => value[key] === undefined || typeof value[key] === 'string',
	);
}

export function validateJsonApiDocument(value: unknown): JsonApiDocument {
	if (!isRecord(value)) throw new Error('Malformed JSON:API envelope: expected an object');

	const hasData = Object.prototype.hasOwnProperty.call(value, 'data');
	const hasErrors = Object.prototype.hasOwnProperty.call(value, 'errors');
	if (hasData === hasErrors) {
		throw new Error('Malformed JSON:API envelope: expected exactly one of data or errors');
	}

	if (hasErrors) {
		if (!Array.isArray(value.errors) || !value.errors.every(isError)) {
			throw new Error('Malformed JSON:API envelope: errors must be an array of error objects');
		}
		return value as unknown as JsonApiDocument;
	}

	if (
		value.data !== null &&
		!isResource(value.data) &&
		!(Array.isArray(value.data) && value.data.every(isResource))
	) {
		throw new Error('Malformed JSON:API envelope: data is not a resource, collection, or null');
	}

	if (
		value.included !== undefined &&
		(!Array.isArray(value.included) || !value.included.every(isResource))
	) {
		throw new Error('Malformed JSON:API envelope: included must be a resource array');
	}

	return value as unknown as JsonApiDocument;
}

export function requireSingleResource(
	document: JsonApiDocument,
	expectedType?: string,
): JsonApiResource {
	if ('errors' in document) throw new Error('BattleMetrics returned a JSON:API error document');
	if (document.data === null || Array.isArray(document.data)) {
		throw new Error('Malformed JSON:API envelope: expected one resource');
	}
	if (expectedType !== undefined && document.data.type !== expectedType) {
		throw new Error(`Malformed JSON:API envelope: expected resource type ${expectedType}`);
	}
	return document.data;
}

export interface JsonApiCollectionDocument extends JsonApiSuccessDocument {
	data: JsonApiResource[];
}

export function requireCollection(
	document: JsonApiDocument,
	expectedType?: string,
): JsonApiCollectionDocument {
	if ('errors' in document) throw new Error('BattleMetrics returned a JSON:API error document');
	if (!Array.isArray(document.data)) {
		throw new Error('Malformed JSON:API envelope: expected a resource collection');
	}
	if (
		expectedType !== undefined &&
		document.data.some((resource) => resource.type !== expectedType)
	) {
		throw new Error(
			`Malformed JSON:API envelope: expected every resource type to be ${expectedType}`,
		);
	}
	return document as JsonApiCollectionDocument;
}
