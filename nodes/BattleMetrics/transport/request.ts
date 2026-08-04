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

export interface BattleMetricsUrlRequestOptions {
	method: IHttpRequestMethods;
	url: URL;
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

async function requestJsonApi(
	this: IExecuteFunctions,
	options: BattleMetricsUrlRequestOptions & {
		query?: Readonly<Record<string, QueryValue | undefined>>;
		body?: JsonValue;
	},
): Promise<JsonApiDocument> {
	const query = queryObject(options.query);
	const credentials = await this.getCredentials('battleMetricsApi', options.itemIndex);
	const accessToken = credentials.accessToken;
	if (typeof accessToken !== 'string' || accessToken.trim() === '') {
		throw normalizeError(new Error('BattleMetrics Access Token is required'), {
			operation: options.operation,
			itemIndex: options.itemIndex,
		});
	}
	const request: IHttpRequestOptions = {
		method: options.method,
		url: options.url.href,
		headers: {
			Accept: JSON_API_MEDIA_TYPE,
			Authorization: `Bearer ${accessToken}`,
			...(options.body === undefined ? {} : { 'Content-Type': JSON_API_MEDIA_TYPE }),
		},
		...(Object.keys(query).length === 0 ? {} : { qs: query }),
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

export async function battleMetricsApiRequest(
	this: IExecuteFunctions,
	options: BattleMetricsRequestOptions,
): Promise<JsonApiDocument> {
	return await requestJsonApi.call(this, {
		...options,
		url: new URL(apiUrl(options.pathSegments)),
	});
}

export async function battleMetricsApiRequestUrl(
	this: IExecuteFunctions,
	options: BattleMetricsUrlRequestOptions,
): Promise<JsonApiDocument> {
	const origin = new URL(BATTLEMETRICS_API_ORIGIN).origin;
	if (
		options.url.protocol !== 'https:' ||
		options.url.origin !== origin ||
		options.url.username !== '' ||
		options.url.password !== ''
	) {
		throw normalizeError(
			new Error('Unsafe pagination link: expected the BattleMetrics HTTPS origin'),
			{
				operation: options.operation,
				itemIndex: options.itemIndex,
			},
		);
	}
	return await requestJsonApi.call(this, options);
}
