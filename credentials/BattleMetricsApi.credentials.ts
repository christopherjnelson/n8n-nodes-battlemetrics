import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

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
			description:
				'A BattleMetrics personal access token. The connection test verifies access to the read-only server directory; other resources may require additional permissions or an eligible BattleMetrics subscription. It is stored only in n8n credentials.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			baseURL: 'https://api.battlemetrics.com',
			url: '/servers',
			headers: {
				Accept: 'application/vnd.api+json',
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message: 'The BattleMetrics access token is invalid or expired.',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 403,
					message:
						'BattleMetrics denied API access. An eligible subscription and sufficient permissions are required.',
				},
			},
		],
	};
}
