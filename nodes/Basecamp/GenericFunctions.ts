import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Basecamp
 */
export async function basecampApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	accountId?: string,
): Promise<any> {
	const account = accountId || (this.getNodeParameter('accountId', 0) as string);

	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n (https://n8n.io)',
		},
		method,
		body,
		qs: query,
		url: `https://3.basecampapi.com/${account}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'basecampOAuth2Api',
			options,
			{
				oauth2: {
					// Basecamp requires credentials in body for token refresh
					includeCredentialsOnRefreshOnBody: true,
				},
			},
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to Basecamp and return all items
 */
export async function basecampApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	accountId?: string,
): Promise<any[]> {
	const returnData: IDataObject[] = [];

	let responseData;
	let nextPage: string | undefined;
	query.page = 1;

	do {
		responseData = await basecampApiRequest.call(this, method, endpoint, body, query, accountId);

		if (Array.isArray(responseData)) {
			returnData.push(...responseData);
		}

		// Basecamp uses Link header for pagination
		// For simplicity, we'll check if we got less items than expected
		if (!Array.isArray(responseData) || responseData.length < 50) {
			nextPage = undefined;
		} else {
			query.page = (query.page as number) + 1;
			nextPage = 'next';
		}
	} while (nextPage);

	return returnData;
}

/**
 * Get Basecamp accounts for the authenticated user
 */
export async function getAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const options: IHttpRequestOptions = {
		headers: {
			'User-Agent': 'n8n (https://n8n.io)',
		},
		method: 'GET',
		url: 'https://launchpad.37signals.com/authorization.json',
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'basecampOAuth2Api',
		options,
	);

	const returnData: INodePropertyOptions[] = [];

	if (responseData.accounts) {
		for (const account of responseData.accounts) {
			// Only include Basecamp 3/4 accounts (bc3 product)
			if (account.product === 'bc3' || account.product === 'bc4') {
				returnData.push({
					name: account.name,
					value: account.id.toString(),
				});
			}
		}
	}

	return returnData;
}

/**
 * Get projects for the selected account
 */
export async function getProjects(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const responseData = await basecampApiRequest.call(this, 'GET', '/projects.json', {}, {}, accountId);

	const returnData: INodePropertyOptions[] = [];

	for (const project of responseData) {
		returnData.push({
			name: project.name,
			value: project.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get todolists for the selected project
 */
export async function getTodolists(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	// First get the todoset for the project
	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const todosetUrl = project.dock?.find((d: IDataObject) => d.name === 'todoset')?.url;

	if (!todosetUrl) {
		return [];
	}

	// Extract the bucket and todoset ID from the URL
	const urlParts = todosetUrl.match(/buckets\/(\d+)\/todosets\/(\d+)/);
	if (!urlParts) {
		return [];
	}

	const todosetId = urlParts[2];
	const todolists = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const todolist of todolists) {
		returnData.push({
			name: todolist.title,
			value: todolist.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get people in the selected project
 */
export async function getPeople(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const responseData = await basecampApiRequest.call(this, 'GET', '/people.json', {}, {}, accountId);

	const returnData: INodePropertyOptions[] = [];

	for (const person of responseData) {
		returnData.push({
			name: person.name,
			value: person.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get message boards for the selected project
 */
export async function getMessageBoards(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const messageBoard = project.dock?.find((d: IDataObject) => d.name === 'message_board');

	if (!messageBoard) {
		return [];
	}

	return [
		{
			name: messageBoard.title || 'Message Board',
			value: messageBoard.id.toString(),
		},
	];
}

/**
 * Get campfires (chat rooms) for the selected project
 */
export async function getCampfires(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const campfire = project.dock?.find((d: IDataObject) => d.name === 'chat');

	if (!campfire) {
		return [];
	}

	return [
		{
			name: campfire.title || 'Campfire',
			value: campfire.id.toString(),
		},
	];
}

/**
 * Get vaults (folders) for the selected project
 */
export async function getVaults(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const vault = project.dock?.find((d: IDataObject) => d.name === 'vault');

	if (!vault) {
		return [];
	}

	// Get all vaults under the root vault
	const vaults = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/vaults/${vault.id}/vaults.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [
		{
			name: vault.title || 'Root Vault',
			value: vault.id.toString(),
		},
	];

	for (const v of vaults) {
		returnData.push({
			name: v.title,
			value: v.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get schedule for the selected project
 */
export async function getSchedules(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const schedule = project.dock?.find((d: IDataObject) => d.name === 'schedule');

	if (!schedule) {
		return [];
	}

	return [
		{
			name: schedule.title || 'Schedule',
			value: schedule.id.toString(),
		},
	];
}

/**
 * Get questionnaires (automatic check-ins) for the selected project
 */
export async function getQuestionnaires(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const questionnaire = project.dock?.find((d: IDataObject) => d.name === 'questionnaire');

	if (!questionnaire) {
		return [];
	}

	return [
		{
			name: questionnaire.title || 'Automatic Check-ins',
			value: questionnaire.id.toString(),
		},
	];
}

/**
 * Get questions for the selected questionnaire
 */
export async function getQuestions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const questionnaireId = this.getNodeParameter('questionnaireId', 0) as string;

	const questions = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/questionnaires/${questionnaireId}/questions.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const question of questions) {
		returnData.push({
			name: question.title,
			value: question.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get card tables (kanban boards) for the selected project
 */
export async function getCardTables(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const kanban = project.dock?.find((d: IDataObject) => d.name === 'kanban_board');

	if (!kanban) {
		return [];
	}

	return [
		{
			name: kanban.title || 'Card Table',
			value: kanban.id.toString(),
		},
	];
}

/**
 * Get card table columns for the selected card table
 */
export async function getCardTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const cardTableId = this.getNodeParameter('cardTableId', 0) as string;

	const cardTable = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/card_tables/${cardTableId}.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	if (cardTable.lists) {
		for (const column of cardTable.lists) {
			returnData.push({
				name: column.title,
				value: column.id.toString(),
			});
		}
	}

	return returnData;
}

/**
 * Get messages for the selected message board
 */
export async function getMessages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const messageBoardId = this.getNodeParameter('messageBoardId', 0) as string;

	const messages = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const message of messages) {
		returnData.push({
			name: message.subject || message.title,
			value: message.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get documents for the selected vault
 */
export async function getDocuments(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const vaultId = this.getNodeParameter('vaultId', 0) as string;

	const documents = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/vaults/${vaultId}/documents.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const doc of documents) {
		returnData.push({
			name: doc.title,
			value: doc.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get uploads for the selected vault
 */
export async function getUploads(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;
	const vaultId = this.getNodeParameter('vaultId', 0) as string;

	const uploads = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/vaults/${vaultId}/uploads.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const upload of uploads) {
		returnData.push({
			name: upload.title || upload.filename,
			value: upload.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get todoset for the selected project
 */
export async function getTodosets(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const project = await basecampApiRequest.call(
		this,
		'GET',
		`/projects/${projectId}.json`,
		{},
		{},
		accountId,
	);

	const todoset = project.dock?.find((d: IDataObject) => d.name === 'todoset');

	if (!todoset) {
		return [];
	}

	return [
		{
			name: todoset.title || 'To-dos',
			value: todoset.id.toString(),
		},
	];
}

/**
 * Get webhooks for the selected project
 */
export async function getWebhooks(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;
	const projectId = this.getNodeParameter('projectId', 0) as string;

	const webhooks = await basecampApiRequest.call(
		this,
		'GET',
		`/buckets/${projectId}/webhooks.json`,
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const webhook of webhooks) {
		returnData.push({
			name: webhook.payload_url || `Webhook ${webhook.id}`,
			value: webhook.id.toString(),
		});
	}

	return returnData;
}

/**
 * Get templates for the account
 */
export async function getTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accountId = this.getNodeParameter('accountId', 0) as string;

	const templates = await basecampApiRequest.call(
		this,
		'GET',
		'/templates.json',
		{},
		{},
		accountId,
	);

	const returnData: INodePropertyOptions[] = [];

	for (const template of templates) {
		returnData.push({
			name: template.name,
			value: template.id.toString(),
		});
	}

	return returnData;
}
