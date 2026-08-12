import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// This credential is read only inside BattleMetricsTrigger.webhook().
export class BattleMetricsWebhookApi implements ICredentialType {
	name = 'battleMetricsWebhookApi';

	displayName = 'BattleMetrics Webhook API';

	icon = {
		light: 'file:../nodes/BattleMetrics/battleMetrics.svg',
		dark: 'file:../nodes/BattleMetrics/battleMetrics.dark.svg',
	} as const;

	documentationUrl =
		'https://github.com/christopherjnelson/n8n-nodes-battlemetrics#battlemetrics-trigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Shared Secret',
			name: 'sharedSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Use the same high-entropy secret in BattleMetrics and n8n. BattleMetrics cannot show an existing secret again, but you can configure a new one if it is lost. Do not use a REST access token or put this secret in the webhook URL or body.',
		},
	];
}
