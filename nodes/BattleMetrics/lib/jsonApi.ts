export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonApiLinkObject {
	href: string;
	meta?: Record<string, JsonValue>;
}

export type JsonApiLink = JsonApiLinkObject | null | string;

export interface JsonApiResourceIdentifier {
	type: string;
	id: string;
	meta?: Record<string, JsonValue>;
}

export interface JsonApiRelationship {
	links?: Record<string, JsonApiLink>;
	data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
	meta?: Record<string, JsonValue>;
}

export interface JsonApiResource extends JsonApiResourceIdentifier {
	attributes?: Record<string, JsonValue>;
	relationships?: Record<string, JsonApiRelationship>;
	links?: Record<string, JsonApiLink>;
}

export interface JsonApiErrorSource {
	pointer?: string;
	parameter?: string;
	header?: string;
}

export interface JsonApiError {
	id?: string;
	status?: string;
	code?: string;
	title?: string;
	detail?: string;
	source?: JsonApiErrorSource;
	links?: Record<string, JsonApiLink>;
	meta?: Record<string, JsonValue>;
}

export interface JsonApiSuccessDocument {
	data: JsonApiResource | JsonApiResource[] | null;
	included?: JsonApiResource[];
	links?: Record<string, JsonApiLink>;
	meta?: Record<string, JsonValue>;
	jsonapi?: { version?: string; meta?: Record<string, JsonValue> };
}

export interface JsonApiErrorDocument {
	errors: JsonApiError[];
	links?: Record<string, JsonApiLink>;
	meta?: Record<string, JsonValue>;
	jsonapi?: { version?: string; meta?: Record<string, JsonValue> };
}

export type JsonApiDocument = JsonApiErrorDocument | JsonApiSuccessDocument;
