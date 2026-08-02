import type {
	ICredentialTestFunction,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BattleMetricsRequestError, normalizeError } from './lib/errors';
import { opaqueResourceId, type ServerId } from './lib/inputValidation';
import { requireSingleResource } from './lib/jsonApiValidation';
import { errorOutput, rawEnvelopeOutput } from './lib/output';
import { battleMetricsApiRequest } from './transport/request';

export class BattleMetrics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BattleMetrics',
		name: 'battleMetrics',
		icon: { light: 'file:battleMetrics.svg', dark: 'file:battleMetrics.dark.svg' },
		group: ['input'],
		version: 1,
		description: 'Read data from the BattleMetrics API (unofficial)',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: { name: 'BattleMetrics' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'battleMetricsApi',
				required: true,
				testedBy: 'battleMetricsApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Server', value: 'server' }],
				default: 'server',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['server'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a server',
						description: 'Get one server by its opaque BattleMetrics server ID',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Server ID',
				name: 'serverId',
				type: 'string',
				required: true,
				default: '',
				description: 'Opaque BattleMetrics server ID. It is never converted to a number.',
				displayOptions: { show: { resource: ['server'], operation: ['get'] } },
			},
		],
	};

	methods = {
		credentialTest: {
			battleMetricsApiCredentialTest: (async () => ({
				status: 'Error',
				message:
					'Automatic validation is unavailable because no endpoint was verified that separates token validity from subscription and resource access. Save the credential and run Server: Get with an approved server ID.',
			})) as ICredentialTestFunction,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			const operation = 'Server: Get';
			try {
				const serverId = opaqueResourceId<'server'>(
					this.getNodeParameter('serverId', itemIndex),
					'Server ID',
				) as ServerId;
				const document = await battleMetricsApiRequest.call(this, {
					method: 'GET',
					pathSegments: ['servers', serverId],
					itemIndex,
					operation,
				});
				requireSingleResource(document, 'server');
				outputs.push(rawEnvelopeOutput(document, itemIndex));
			} catch (error) {
				const normalized = normalizeError(error, { operation, itemIndex });
				if (this.continueOnFail()) {
					outputs.push(errorOutput(normalized.message, operation, itemIndex));
					continue;
				}
				if (error instanceof BattleMetricsRequestError) {
					throw new NodeOperationError(this.getNode(), normalized.message, {
						itemIndex,
						description: `BattleMetrics ${operation} failed`,
					});
				}
				throw new NodeOperationError(this.getNode(), normalized.message, { itemIndex });
			}
		}

		return [outputs];
	}
}
