import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class BattleMetricsApi implements ICredentialType {
	name = 'battleMetricsApi';

	displayName = 'BattleMetrics API';

	icon = {
		light: 'file:../nodes/BattleMetrics/battleMetrics.svg',
		dark: 'file:../nodes/BattleMetrics/battleMetrics.dark.svg',
	} as const;

	documentationUrl = 'https://github.com/christopherjnelson/n8n-nodes-battlemetrics#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'A BattleMetrics personal access token. It is stored only in n8n credentials.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};
}
