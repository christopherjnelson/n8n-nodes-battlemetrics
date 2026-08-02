import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { normalizeError } from '../lib/errors';
import { validateJsonApiDocument } from '../lib/jsonApiValidation';
import type { JsonApiDocument, JsonValue } from '../lib/jsonApi';
import { BATTLEMETRICS_API_ORIGIN, DEFAULT_TIMEOUT_MS, JSON_API_MEDIA_TYPE } from './constants';

export type QueryValue = boolean | number | string;

export interface BattleMetricsRequestOptions {
	method: IHttpRequestMethods;
	pathSegments: readonly string[];
	query?: Readonly<Record<string, QueryValue | undefined>>;
	body?: JsonValue;
	itemIndex: number;
	operation: string;
	timeoutMs?: number;
}

export function encodedApiPath(pathSegments: readonly string[]): string {
	return `/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

export function apiUrl(pathSegments: readonly string[]): string {
	return `${BATTLEMETRICS_API_ORIGIN}${encodedApiPath(pathSegments)}`;
}

export function queryObject(
	query: Readonly<Record<string, QueryValue | undefined>> = {},
): IDataObject {
	return Object.fromEntries(
		Object.entries(query).filter((entry) => entry[1] !== undefined),
	) as IDataObject;
}

export async function battleMetricsApiRequest(
	this: IExecuteFunctions,
	options: BattleMetricsRequestOptions,
): Promise<JsonApiDocument> {
	const request: IHttpRequestOptions = {
		method: options.method,
		url: apiUrl(options.pathSegments),
		headers: {
			Accept: JSON_API_MEDIA_TYPE,
			...(options.body === undefined ? {} : { 'Content-Type': JSON_API_MEDIA_TYPE }),
		},
		qs: queryObject(options.query),
		timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		json: true,
		...(options.body === undefined ? {} : { body: options.body }),
	};

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'battleMetricsApi',
			request,
		);
		return validateJsonApiDocument(response);
	} catch (error) {
		throw normalizeError(error, {
			operation: options.operation,
			itemIndex: options.itemIndex,
		});
	}
}
