import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AiOrchestratorApi implements ICredentialType {
	name = 'aiOrchestratorApi';
	displayName = 'AI Orchestrator API';
	documentationUrl = 'https://github.com/your-org/n8n-nodes-ai-orchestrator';
	properties: INodeProperties[] = [
		{
			displayName: 'OpenAI API Key',
			name: 'openaiApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Anthropic API Key',
			name: 'anthropicApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Gemini API Key',
			name: 'geminiApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'OpenAI Base URL',
			name: 'openaiBaseUrl',
			type: 'string',
			default: 'https://api.openai.com/v1',
		},
		{
			displayName: 'Anthropic Base URL',
			name: 'anthropicBaseUrl',
			type: 'string',
			default: 'https://api.anthropic.com/v1',
		},
		{
			displayName: 'Gemini Base URL',
			name: 'geminiBaseUrl',
			type: 'string',
			default: 'https://generativelanguage.googleapis.com/v1beta',
		},
	];
}
