declare const opaqueIdBrand: unique symbol;

export class InputValidationError extends Error {
	override readonly name = 'InputValidationError';
}

export type OpaqueId<Category extends string> = string & {
	readonly [opaqueIdBrand]: Category;
};

export type ServerId = OpaqueId<'server'>;
export type PlayerId = OpaqueId<'player'>;
export type OrganizationId = OpaqueId<'organization'>;
export type BanListId = OpaqueId<'banList'>;
export type BanId = OpaqueId<'ban'>;
export type GameIdentifier = OpaqueId<'game'>;
export type ExternalPlatformIdentifier = OpaqueId<'externalPlatform'>;

export function requiredTrimmedString(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
	return value.trim();
}

export function opaqueResourceId<Category extends string>(
	value: unknown,
	label: string,
): OpaqueId<Category> {
	return requiredTrimmedString(value, label) as OpaqueId<Category>;
}

export function positiveSafeInteger(value: unknown, label: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${label} must be a positive safe integer`);
	}
	return value;
}

export function optionalFilter(value: unknown, label: string): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	return requiredTrimmedString(value, label);
}

export function controlledEnum<const T extends readonly string[]>(
	value: unknown,
	allowed: T,
	label: string,
): T[number] {
	if (typeof value !== 'string' || !allowed.includes(value)) {
		throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
	}
	return value;
}

export function pageSize(value: unknown, maximum: number): number {
	const size = positiveSafeInteger(value, 'Page size');
	if (size > maximum) throw new Error(`Page size must not exceed ${maximum}`);
	return size;
}

export function isoDateTime(value: unknown, label: string): string {
	const input = requiredTrimmedString(value, label);
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(input)) {
		throw new Error(`${label} must be an ISO 8601 date-time with a timezone`);
	}
	if (Number.isNaN(Date.parse(input))) throw new Error(`${label} must be a valid date-time`);
	return input;
}

export function jsonApiResourceIdentifier<Category extends string>(
	type: unknown,
	id: unknown,
	expectedType: string,
	idLabel: string,
): { type: string; id: OpaqueId<Category> } {
	const resourceType = requiredTrimmedString(type, 'Resource type');
	if (resourceType !== expectedType) throw new Error(`Resource type must be ${expectedType}`);
	return { type: resourceType, id: opaqueResourceId<Category>(id, idLabel) };
}

export function validUrl(value: unknown, label = 'URL'): URL {
	const input = requiredTrimmedString(value, label);
	if (!URL.canParse(input)) {
		throw new InputValidationError(`${label} must be a valid URL`);
	}
	return new URL(input);
}
