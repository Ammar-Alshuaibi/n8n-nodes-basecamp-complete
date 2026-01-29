import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BasecampOAuth2Api implements ICredentialType {
name = 'basecampOAuth2Api';

extends = ['oAuth2Api'];

displayName = 'Basecamp OAuth2 API';

documentationUrl = 'basecamp';

properties: INodeProperties[] = [
{
displayName: 'Grant Type',
name: 'grantType',
type: 'hidden',
default: 'authorizationCode',
},
{
displayName: 'Authorization URL',
name: 'authUrl',
type: 'hidden',
default: 'https://launchpad.37signals.com/authorization/new',
required: true,
},
{
displayName: 'Access Token URL',
name: 'accessTokenUrl',
type: 'hidden',
default: 'https://launchpad.37signals.com/authorization/token',
required: true,
},
{
displayName: 'Scope',
name: 'scope',
type: 'hidden',
default: '',
},
{
displayName: 'Auth URI Query Parameters',
name: 'authQueryParameters',
type: 'hidden',
default: 'type=web_server',
},
{
displayName: 'Additional Body Properties',
name: 'additionalBodyProperties',
type: 'hidden',
default: '{"type":"web_server"}',
},
{
displayName: 'Authentication',
name: 'authentication',
type: 'hidden',
default: 'body',
},
];
}
