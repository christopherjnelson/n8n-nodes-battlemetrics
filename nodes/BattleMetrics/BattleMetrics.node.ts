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
import {
	collectionOutput,
	combinedCollectionOutput,
	errorOutput,
	rawEnvelopeOutput,
} from './lib/output';
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
		description: 'Read raw server and game data from the BattleMetrics API (unofficial)',
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
				options: [
					{
						name: 'Game',
						value: 'game',
						description: 'A game supported by the BattleMetrics server directory',
					},
					{
						name: 'Server',
						value: 'server',
						description: 'A game server identified by its BattleMetrics server ID',
					},
				],
				default: 'server',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['game'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many games',
						description:
							"Get the raw game collection in the API's default ordering, with no server-side parameters. Limit trims locally; Return All follows pagination with 100-page and 10,000-item caps. Authentication and subscription requirements may vary.",
					},
				],
				default: 'getAll',
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
						description:
							'Get one raw server envelope by its BattleMetrics server ID. API access may require an eligible subscription.',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many servers',
						description:
							"Get the raw server collection in the API's default ordering, with no server-side filters. Limit trims locally; Return All follows pagination with 100-page and 10,000-item caps. API access may require an eligible subscription.",
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
				displayOptions: { show: { resource: ['server', 'game'], operation: ['getAll'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: DEFAULT_MAX_ITEMS },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: { resource: ['server', 'game'], operation: ['getAll'], returnAll: [false] },
				},
			},
			{
				displayName: 'Server ID',
				name: 'serverId',
				type: 'string',
				required: true,
				default: '',
				description:
					'Opaque BattleMetrics server ID, not a server name, address, Steam ID, or game ID. It remains a string.',
				displayOptions: { show: { resource: ['server'], operation: ['get'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			const resource = this.getNodeParameter('resource', itemIndex) as string;
			const selectedOperation = this.getNodeParameter('operation', itemIndex);
			const resourceLabel = resource === 'game' ? 'Game' : 'Server';
			const operation =
				selectedOperation === 'getAll' ? `${resourceLabel}: Get Many` : `${resourceLabel}: Get`;
			try {
				if (resource === 'server' && selectedOperation === 'get') {
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

				if (!['server', 'game'].includes(resource) || selectedOperation !== 'getAll') {
					throw new NodeOperationError(this.getNode(), `Unsupported ${resourceLabel} operation`, {
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
					pathSegments: [resource === 'game' ? 'games' : 'servers'],
					itemIndex,
					operation,
				});
				requireCollection(initial, resource);
				const result = await collectPages(
					initial,
					async (url) => {
						const expectedPath = resource === 'game' ? '/games' : '/servers';
						if (url.pathname !== expectedPath) {
							throw new NodeOperationError(
								this.getNode(),
								`Unsafe pagination link: expected the ${expectedPath} path`,
								{ itemIndex },
							);
						}
						const next = await battleMetricsApiRequestUrl.call(this, {
							method: 'GET',
							url,
							itemIndex,
							operation,
						});
						requireCollection(next, resource);
						return next;
					},
					{ ...(limit === undefined ? {} : { limit }) },
				);
				outputs.push(
					resource === 'game'
						? collectionOutput(result.documents, itemIndex, limit)
						: combinedCollectionOutput(result.documents, itemIndex, limit),
				);
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
