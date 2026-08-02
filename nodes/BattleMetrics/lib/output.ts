import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { JsonApiDocument } from './jsonApi';

export function rawEnvelopeOutput(
	document: JsonApiDocument,
	itemIndex: number,
): INodeExecutionData {
	return {
		json: document as unknown as IDataObject,
		pairedItem: { item: itemIndex },
	};
}

export function errorOutput(
	message: string,
	operation: string,
	itemIndex: number,
): INodeExecutionData {
	return {
		json: { error: message, operation, itemIndex },
		pairedItem: { item: itemIndex },
	};
}
