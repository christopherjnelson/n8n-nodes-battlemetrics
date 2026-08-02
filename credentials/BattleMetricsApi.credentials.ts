import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

// A network test cannot distinguish all credential/subscription states; see ADR 0004.
// eslint-disable-next-line @n8n/community-nodes/credential-test-required
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
				'A BattleMetrics personal access token. A token may not include REST API access without an eligible BattleMetrics subscription. n8n cannot prevalidate this reliably, so the credential is validated when an operation runs. It is stored only in n8n credentials.',
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
