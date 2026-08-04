import { createHmac, timingSafeEqual } from 'node:crypto';

type WebhookHeaders = Record<string, string | readonly string[] | undefined>;

const SHA256_HEX_LENGTH = 64;
const ISO_8601_TIMESTAMP =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

export class WebhookRequestError extends Error {
	constructor(
		public readonly statusCode: 400 | 401 | 415 | 500,
		message: string,
	) {
		super(message);
		this.name = 'WebhookRequestError';
	}
}

export interface ParsedSignature {
	timestamp: string;
	signature: Buffer;
}

function isValidIso8601(value: string): boolean {
	const match = ISO_8601_TIMESTAMP.exec(value);
	if (!match) return false;

	const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const hour = Number(hourText);
	const minute = Number(minuteText);
	const second = Number(secondText);
	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
		hour > 23 ||
		minute > 59 ||
		second > 59
	) {
		return false;
	}
	if (zone !== 'Z') {
		const offsetHour = Number(zone?.slice(1, 3));
		const offsetMinute = Number(zone?.slice(4, 6));
		if (offsetHour > 23 || offsetMinute > 59) return false;
	}
	return Number.isFinite(Date.parse(value));
}

export function getSingleSignatureHeader(
	headers: WebhookHeaders,
	rawHeaders?: readonly string[],
): string {
	if (rawHeaders) {
		let occurrences = 0;
		for (let index = 0; index < rawHeaders.length; index += 2) {
			if (rawHeaders[index]?.toLowerCase() === 'x-signature') occurrences += 1;
		}
		if (occurrences > 1) throw new WebhookRequestError(401, 'Ambiguous signature header');
	}

	const values = Object.entries(headers).filter(([name]) => name.toLowerCase() === 'x-signature');
	if (values.length !== 1) throw new WebhookRequestError(401, 'Missing signature header');
	const value = values[0]?.[1];
	if (typeof value !== 'string') {
		if (value !== undefined) throw new WebhookRequestError(401, 'Ambiguous signature header');
		throw new WebhookRequestError(401, 'Missing signature header');
	}
	return value;
}

export function parseSignatureHeader(header: string): ParsedSignature {
	const components = header.split(',');
	let timestamp: string | undefined;
	let signatureHex: string | undefined;

	for (const component of components) {
		const trimmed = component.trim();
		const equalsIndex = trimmed.indexOf('=');
		if (equalsIndex <= 0 || equalsIndex === trimmed.length - 1) {
			throw new WebhookRequestError(401, 'Malformed signature header');
		}
		const name = trimmed.slice(0, equalsIndex);
		const value = trimmed.slice(equalsIndex + 1);
		if (name !== name.trim() || value !== value.trim()) {
			throw new WebhookRequestError(401, 'Malformed signature header');
		}
		if (name === 't') {
			if (timestamp !== undefined) throw new WebhookRequestError(401, 'Duplicate timestamp');
			timestamp = value;
		} else if (name === 's') {
			if (signatureHex !== undefined) throw new WebhookRequestError(401, 'Duplicate signature');
			signatureHex = value;
		} else {
			throw new WebhookRequestError(401, 'Unknown signature component');
		}
	}

	if (timestamp === undefined) throw new WebhookRequestError(401, 'Missing timestamp');
	if (signatureHex === undefined) throw new WebhookRequestError(401, 'Missing signature');
	if (!isValidIso8601(timestamp)) throw new WebhookRequestError(401, 'Invalid signature timestamp');
	if (!/^[0-9a-fA-F]+$/.test(signatureHex)) {
		throw new WebhookRequestError(401, 'Invalid signature encoding');
	}
	if (signatureHex.length !== SHA256_HEX_LENGTH) {
		throw new WebhookRequestError(401, 'Invalid signature length');
	}

	return { timestamp, signature: Buffer.from(signatureHex, 'hex') };
}

export function verifySignature(
	rawBody: Buffer,
	sharedSecret: string,
	parsed: ParsedSignature,
): void {
	if (sharedSecret.length === 0 || sharedSecret.trim().length === 0) {
		throw new WebhookRequestError(500, 'Webhook credential is not configured');
	}
	const expected = createHmac('sha256', sharedSecret)
		.update(parsed.timestamp, 'utf8')
		.update('.', 'utf8')
		.update(rawBody)
		.digest();
	if (expected.length !== parsed.signature.length || !timingSafeEqual(expected, parsed.signature)) {
		throw new WebhookRequestError(401, 'Invalid webhook signature');
	}
}
