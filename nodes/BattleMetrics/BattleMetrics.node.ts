import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { BattleMetricsRequestError, normalizeError } from './lib/errors';
import { opaqueResourceId, type ServerId } from './lib/inputValidation';
import { requireCollection, requireSingleResource } from './lib/jsonApiValidation';
import { combinedCollectionOutput, errorOutput, rawEnvelopeOutput } from './lib/output';
import { collectPages } from './lib/pagination';
import { DEFAULT_MAX_ITEMS } from './transport/constants';
import { battleMetricsApiRequest, battleMetricsApiRequestUrl } from './transport/request';

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
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many servers',
						description:
							'Get the server collection. BattleMetrics REST API access may require an eligible subscription.',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { resource: ['server'], operation: ['getAll'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: DEFAULT_MAX_ITEMS },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: { resource: ['server'], operation: ['getAll'], returnAll: [false] },
				},
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			const selectedOperation = this.getNodeParameter('operation', itemIndex);
			const operation = selectedOperation === 'getAll' ? 'Server: Get Many' : 'Server: Get';
			try {
				if (selectedOperation === 'get') {
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
					continue;
				}

				if (selectedOperation !== 'getAll') {
					throw new NodeOperationError(this.getNode(), 'Unsupported Server operation', {
						itemIndex,
					});
				}
				const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
				const limitValue = returnAll ? undefined : this.getNodeParameter('limit', itemIndex);
				if (
					limitValue !== undefined &&
					(typeof limitValue !== 'number' ||
						!Number.isSafeInteger(limitValue) ||
						limitValue < 1 ||
						limitValue > DEFAULT_MAX_ITEMS)
				) {
					throw new NodeOperationError(
						this.getNode(),
						`Limit must be an integer from 1 through ${DEFAULT_MAX_ITEMS}`,
						{ itemIndex },
					);
				}
				const limit = limitValue as number | undefined;
				const initial = await battleMetricsApiRequest.call(this, {
					method: 'GET',
					pathSegments: ['servers'],
					itemIndex,
					operation,
				});
				requireCollection(initial, 'server');
				const result = await collectPages(
					initial,
					async (url) => {
						if (url.pathname !== '/servers') {
							throw new NodeOperationError(
								this.getNode(),
								'Unsafe pagination link: expected the /servers path',
								{ itemIndex },
							);
						}
						const next = await battleMetricsApiRequestUrl.call(this, {
							method: 'GET',
							url,
							itemIndex,
							operation,
						});
						requireCollection(next, 'server');
						return next;
					},
					{ ...(limit === undefined ? {} : { limit }) },
				);
				outputs.push(combinedCollectionOutput(result.documents, itemIndex, limit));
			} catch (error) {
				const normalized = normalizeError(error, { operation, itemIndex });
				if (this.continueOnFail()) {
					outputs.push(errorOutput(normalized, operation, itemIndex));
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
