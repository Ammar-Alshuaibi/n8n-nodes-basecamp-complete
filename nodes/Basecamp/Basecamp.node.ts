import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	basecampApiRequest,
	basecampApiRequestAllItems,
	getAccounts,
	getCampfires,
	getCardTableColumns,
	getCardTables,
	getDocuments,
	getMessageBoards,
	getMessages,
	getPeople,
	getProjects,
	getQuestions,
	getQuestionnaires,
	getSchedules,
	getTemplates,
	getTodolists,
	getTodosets,
	getUploads,
	getVaults,
	getWebhooks,
} from './GenericFunctions';

export class Basecamp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Basecamp',
		name: 'basecamp',
		icon: 'file:basecamp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Basecamp API',
		defaults: {
			name: 'Basecamp',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'basecampOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Account Name or ID',
				name: 'accountId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				default: '',
				required: true,
				description: 'The Basecamp account to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Campfire',
						value: 'campfire',
					},
					{
						name: 'Campfire Line',
						value: 'campfireLine',
					},
					{
						name: 'Card',
						value: 'card',
					},
					{
						name: 'Card Table',
						value: 'cardTable',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Question',
						value: 'question',
					},
					{
						name: 'Question Answer',
						value: 'questionAnswer',
					},
					{
						name: 'Schedule Entry',
						value: 'scheduleEntry',
					},
					{
						name: 'Template',
						value: 'template',
					},
					{
						name: 'To-Do',
						value: 'todo',
					},
					{
						name: 'To-Do List',
						value: 'todolist',
					},
					{
						name: 'Upload',
						value: 'upload',
					},
					{
						name: 'Vault',
						value: 'vault',
					},
					{
						name: 'Webhook',
						value: 'webhook',
					},
				],
				default: 'project',
			},

			// ----------------------------------
			//         Project
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['project'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new project',
						action: 'Create a project',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a project',
						action: 'Delete a project',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a project',
						action: 'Get a project',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many projects',
						action: 'Get many projects',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a project',
						action: 'Update a project',
					},
				],
				default: 'getAll',
			},

			// Project: Create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['create'],
					},
				},
				description: 'Name of the project',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the project',
					},
				],
			},

			// Project: Get, Delete, Update
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['get', 'delete', 'update'],
					},
				},
				description: 'The project to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Project: Update
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'New name for the project',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'New description for the project',
					},
				],
			},

			// Project: Get All
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['project'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         To-Do List
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['todolist'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new to-do list',
						action: 'Create a to-do list',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a to-do list',
						action: 'Get a to-do list',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many to-do lists',
						action: 'Get many to-do lists',
					},
				],
				default: 'getAll',
			},

			// To-Do List: Project Selection
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todolist'],
					},
				},
				description: 'The project containing the to-do lists. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// To-Do List: Create
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['create'],
					},
				},
				description: 'Name of the to-do list',
			},
			{
				displayName: 'Todoset ID',
				name: 'todosetId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['create'],
					},
				},
				description: 'The ID of the todoset (found in project details)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the to-do list',
					},
				],
			},

			// To-Do List: Get
			{
				displayName: 'To-Do List Name or ID',
				name: 'todolistId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTodolists',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['get'],
					},
				},
				description: 'The to-do list to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// To-Do List: Get All
			{
				displayName: 'Todoset ID',
				name: 'todosetId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['getAll'],
					},
				},
				description: 'The ID of the todoset (found in project details)',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['todolist'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         To-Do
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['todo'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new to-do',
						action: 'Create a to-do',
					},
					{
						name: 'Complete',
						value: 'complete',
						description: 'Mark a to-do as complete',
						action: 'Complete a to-do',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a to-do',
						action: 'Delete a to-do',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a to-do',
						action: 'Get a to-do',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many to-dos',
						action: 'Get many to-dos',
					},
					{
						name: 'Uncomplete',
						value: 'uncomplete',
						description: 'Mark a to-do as incomplete',
						action: 'Uncomplete a to-do',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a to-do',
						action: 'Update a to-do',
					},
				],
				default: 'create',
			},

			// To-Do: Project Selection
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todo'],
					},
				},
				description: 'The project containing the to-dos. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// To-Do: Create
			{
				displayName: 'To-Do List Name or ID',
				name: 'todolistId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTodolists',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['create', 'getAll'],
					},
				},
				description: 'The to-do list to add the to-do to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['create'],
					},
				},
				description: 'The content/title of the to-do',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the to-do (supports HTML)',
					},
					{
						displayName: 'Due On',
						name: 'due_on',
						type: 'dateTime',
						default: '',
						description: 'Due date for the to-do',
					},
					{
						displayName: 'Starts On',
						name: 'starts_on',
						type: 'dateTime',
						default: '',
						description: 'Start date for the to-do',
					},
					{
						displayName: 'Assignee Names or IDs',
						name: 'assignee_ids',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getPeople',
						},
						default: [],
						description: 'People to assign this to-do to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Notify',
						name: 'notify',
						type: 'boolean',
						default: false,
						description: 'Whether to notify assignees',
					},
				],
			},

			// To-Do: Get, Delete, Complete, Uncomplete, Update
			{
				displayName: 'To-Do ID',
				name: 'todoId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['get', 'delete', 'complete', 'uncomplete', 'update'],
					},
				},
				description: 'The ID of the to-do',
			},

			// To-Do: Update
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'New content/title for the to-do',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'New description for the to-do (supports HTML)',
					},
					{
						displayName: 'Due On',
						name: 'due_on',
						type: 'dateTime',
						default: '',
						description: 'New due date for the to-do',
					},
					{
						displayName: 'Starts On',
						name: 'starts_on',
						type: 'dateTime',
						default: '',
						description: 'New start date for the to-do',
					},
					{
						displayName: 'Assignee Names or IDs',
						name: 'assignee_ids',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getPeople',
						},
						default: [],
						description: 'People to assign this to-do to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},

			// To-Do: Get All
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['todo'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'All',
								value: '',
							},
							{
								name: 'Archived',
								value: 'archived',
							},
							{
								name: 'Trashed',
								value: 'trashed',
							},
						],
						default: '',
						description: 'Filter by status',
					},
					{
						displayName: 'Completed',
						name: 'completed',
						type: 'boolean',
						default: false,
						description: 'Whether to return only completed to-dos',
					},
				],
			},

			// ----------------------------------
			//         Message
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new message',
						action: 'Create a message',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a message',
						action: 'Get a message',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many messages',
						action: 'Get many messages',
					},
				],
				default: 'create',
			},

			// Message: Project Selection
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				description: 'The project to post the message to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Message: Create
			{
				displayName: 'Message Board ID',
				name: 'messageBoardId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create', 'getAll'],
					},
				},
				description: 'The ID of the message board (found in project details)',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create'],
					},
				},
				description: 'Subject of the message',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'Content of the message (supports HTML)',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Active',
								value: 'active',
							},
							{
								name: 'Draft',
								value: 'draft',
							},
						],
						default: 'active',
						description: 'Status of the message',
					},
				],
			},

			// Message: Get
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['get'],
					},
				},
				description: 'The ID of the message',
			},

			// Message: Get All
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Comment
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['comment'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new comment',
						action: 'Create a comment',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many comments',
						action: 'Get many comments',
					},
				],
				default: 'create',
			},

			// Comment: Project Selection
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['comment'],
					},
				},
				description: 'The project containing the recording. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// Comment: Recording ID (the item to comment on)
			{
				displayName: 'Recording ID',
				name: 'recordingId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['comment'],
					},
				},
				description: 'The ID of the recording (to-do, message, etc.) to comment on or get comments from',
			},

			// Comment: Create
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['comment'],
						operation: ['create'],
					},
				},
				description: 'Content of the comment (supports HTML)',
			},

			// Comment: Get All
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['comment'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['comment'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Campfire (Chat)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['campfire'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a campfire',
						action: 'Get a campfire',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfire'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Campfire Name or ID',
				name: 'campfireId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCampfires',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfire'],
						operation: ['get'],
					},
				},
				description: 'The campfire to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ----------------------------------
			//         Campfire Line (Chat Message)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['campfireLine'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new campfire line (chat message)',
						action: 'Create a campfire line',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a campfire line',
						action: 'Get a campfire line',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many campfire lines',
						action: 'Get many campfire lines',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a campfire line',
						action: 'Delete a campfire line',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Campfire Name or ID',
				name: 'campfireId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCampfires',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
					},
				},
				description: 'The campfire. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
						operation: ['create'],
					},
				},
				description: 'The content of the chat message (supports HTML)',
			},
			{
				displayName: 'Line ID',
				name: 'lineId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
						operation: ['get', 'delete'],
					},
				},
				description: 'The ID of the campfire line',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['campfireLine'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Card Table (Kanban)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cardTable'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a card table',
						action: 'Get a card table',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['cardTable'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Card Table Name or ID',
				name: 'cardTableId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCardTables',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['cardTable'],
						operation: ['get'],
					},
				},
				description: 'The card table. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},

			// ----------------------------------
			//         Card
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['card'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new card',
						action: 'Create a card',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a card',
						action: 'Get a card',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many cards',
						action: 'Get many cards',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a card',
						action: 'Update a card',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['card'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Card Table Name or ID',
				name: 'cardTableId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCardTables',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['card'],
					},
				},
				description: 'The card table. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Column Name or ID',
				name: 'columnId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCardTableColumns',
					loadOptionsDependsOn: ['cardTableId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['create', 'getAll'],
					},
				},
				description: 'The column. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['create'],
					},
				},
				description: 'Title of the card',
			},
			{
				displayName: 'Card ID',
				name: 'cardId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['get', 'update'],
					},
				},
				description: 'The ID of the card',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'Content of the card (supports HTML)',
					},
					{
						displayName: 'Due On',
						name: 'due_on',
						type: 'dateTime',
						default: '',
						description: 'Due date of the card',
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'New title for the card',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'New content of the card (supports HTML)',
					},
					{
						displayName: 'Due On',
						name: 'due_on',
						type: 'dateTime',
						default: '',
						description: 'New due date of the card',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['card'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Document
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new document',
						action: 'Create a document',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a document',
						action: 'Get a document',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many documents',
						action: 'Get many documents',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a document',
						action: 'Update a document',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Vault Name or ID',
				name: 'vaultId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVaults',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				description: 'The vault (folder). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['create'],
					},
				},
				description: 'Title of the document',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['create'],
					},
				},
				description: 'Content of the document (supports HTML)',
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['get', 'update'],
					},
				},
				description: 'The ID of the document',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'New title for the document',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
						description: 'New content of the document (supports HTML)',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Event (Activity Log)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['event'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many events from the activity log',
						action: 'Get many events',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['event'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Person
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['person'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a person',
						action: 'Get a person',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many people',
						action: 'Get many people',
					},
					{
						name: 'Get My Profile',
						value: 'getMe',
						description: 'Get the currently authenticated user',
						action: 'Get my profile',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Person Name or ID',
				name: 'personId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPeople',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['person'],
						operation: ['get'],
					},
				},
				description: 'The person to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['person'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['person'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Question (Check-in)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['question'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a question',
						action: 'Get a question',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many questions',
						action: 'Get many questions',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['question'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Questionnaire Name or ID',
				name: 'questionnaireId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQuestionnaires',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['question'],
					},
				},
				description: 'The questionnaire. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Question Name or ID',
				name: 'questionId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQuestions',
					loadOptionsDependsOn: ['questionnaireId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['question'],
						operation: ['get'],
					},
				},
				description: 'The question. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['question'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['question'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Question Answer
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many question answers',
						action: 'Get many question answers',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Questionnaire Name or ID',
				name: 'questionnaireId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQuestionnaires',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
					},
				},
				description: 'The questionnaire. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Question Name or ID',
				name: 'questionId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQuestions',
					loadOptionsDependsOn: ['questionnaireId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
					},
				},
				description: 'The question. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['questionAnswer'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Schedule Entry
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new schedule entry',
						action: 'Create a schedule entry',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a schedule entry',
						action: 'Get a schedule entry',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many schedule entries',
						action: 'Get many schedule entries',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a schedule entry',
						action: 'Update a schedule entry',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Schedule Name or ID',
				name: 'scheduleId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSchedules',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
					},
				},
				description: 'The schedule. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['create'],
					},
				},
				description: 'Summary of the schedule entry',
			},
			{
				displayName: 'Starts At',
				name: 'startsAt',
				type: 'dateTime',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['create'],
					},
				},
				description: 'Start date/time of the schedule entry',
			},
			{
				displayName: 'Ends At',
				name: 'endsAt',
				type: 'dateTime',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['create'],
					},
				},
				description: 'End date/time of the schedule entry',
			},
			{
				displayName: 'Schedule Entry ID',
				name: 'scheduleEntryId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['get', 'update'],
					},
				},
				description: 'The ID of the schedule entry',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the schedule entry (supports HTML)',
					},
					{
						displayName: 'All Day',
						name: 'all_day',
						type: 'boolean',
						default: false,
						description: 'Whether this is an all-day event',
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Summary',
						name: 'summary',
						type: 'string',
						default: '',
						description: 'New summary for the schedule entry',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'New description (supports HTML)',
					},
					{
						displayName: 'Starts At',
						name: 'starts_at',
						type: 'dateTime',
						default: '',
						description: 'New start date/time',
					},
					{
						displayName: 'Ends At',
						name: 'ends_at',
						type: 'dateTime',
						default: '',
						description: 'New end date/time',
					},
					{
						displayName: 'All Day',
						name: 'all_day',
						type: 'boolean',
						default: false,
						description: 'Whether this is an all-day event',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['scheduleEntry'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Template
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['template'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a template',
						action: 'Get a template',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many templates',
						action: 'Get many templates',
					},
					{
						name: 'Create Project',
						value: 'createProject',
						description: 'Create a project from a template',
						action: 'Create project from template',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Template Name or ID',
				name: 'templateId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['get', 'createProject'],
					},
				},
				description: 'The template. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Project Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['createProject'],
					},
				},
				description: 'Name of the new project',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['createProject'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description of the new project',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['template'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Upload (File)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['upload'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an upload',
						action: 'Get an upload',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many uploads',
						action: 'Get many uploads',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['upload'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Vault Name or ID',
				name: 'vaultId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVaults',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['getAll'],
					},
				},
				description: 'The vault (folder). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Upload ID',
				name: 'uploadId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['get'],
					},
				},
				description: 'The ID of the upload',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Vault (Folder)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['vault'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new vault (folder)',
						action: 'Create a vault',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a vault',
						action: 'Get a vault',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many vaults',
						action: 'Get many vaults',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a vault',
						action: 'Update a vault',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['vault'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent Vault Name or ID',
				name: 'parentVaultId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getVaults',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['create', 'getAll'],
					},
				},
				description: 'The parent vault. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['create'],
					},
				},
				description: 'Title of the vault',
			},
			{
				displayName: 'Vault ID',
				name: 'vaultId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['get', 'update'],
					},
				},
				description: 'The ID of the vault',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'New title for the vault',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['vault'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},

			// ----------------------------------
			//         Webhook
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new webhook',
						action: 'Create a webhook',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a webhook',
						action: 'Delete a webhook',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many webhooks',
						action: 'Get many webhooks',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a webhook',
						action: 'Update a webhook',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['webhook'],
					},
				},
				description: 'The project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Payload URL',
				name: 'payloadUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['create'],
					},
				},
				description: 'The URL to send webhook payloads to',
			},
			{
				displayName: 'Event Types',
				name: 'types',
				type: 'multiOptions',
				required: true,
				default: [],
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Card Created', value: 'Card.created' },
					{ name: 'Card Updated', value: 'Card.updated' },
					{ name: 'Card Archived', value: 'Card.archived' },
					{ name: 'Comment Created', value: 'Comment.created' },
					{ name: 'Document Created', value: 'Document.created' },
					{ name: 'Document Updated', value: 'Document.updated' },
					{ name: 'Message Created', value: 'Message.created' },
					{ name: 'Todo Created', value: 'Todo.created' },
					{ name: 'Todo Completed', value: 'Todo.completed' },
					{ name: 'Todolist Created', value: 'Todolist.created' },
					{ name: 'Upload Created', value: 'Upload.created' },
				],
				description: 'The types of events to subscribe to',
			},
			{
				displayName: 'Webhook Name or ID',
				name: 'webhookId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWebhooks',
					loadOptionsDependsOn: ['projectId'],
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['delete', 'update'],
					},
				},
				description: 'The webhook. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Payload URL',
						name: 'payload_url',
						type: 'string',
						default: '',
						description: 'New payload URL',
					},
					{
						displayName: 'Active',
						name: 'active',
						type: 'boolean',
						default: true,
						description: 'Whether the webhook is active',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['getAll'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['webhook'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
			getCampfires,
			getCardTableColumns,
			getCardTables,
			getDocuments,
			getMessageBoards,
			getMessages,
			getPeople,
			getProjects,
			getQuestions,
			getQuestionnaires,
			getSchedules,
			getTemplates,
			getTodolists,
			getTodosets,
			getUploads,
			getVaults,
			getWebhooks,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const accountId = this.getNodeParameter('accountId', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				if (resource === 'project') {
					// ----------------------------------
					//         project
					// ----------------------------------

					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							'/projects.json',
							body,
							{},
							accountId,
						);
					}

					if (operation === 'delete') {
						const projectId = this.getNodeParameter('projectId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'DELETE',
							`/projects/${projectId}.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true };
					}

					if (operation === 'get') {
						const projectId = this.getNodeParameter('projectId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/projects/${projectId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								'/projects.json',
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								'/projects.json',
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/projects/${projectId}.json`,
							updateFields,
							{},
							accountId,
						);
					}
				}

				if (resource === 'todolist') {
					// ----------------------------------
					//         todolist
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const todosetId = this.getNodeParameter('todosetId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const todolistId = this.getNodeParameter('todolistId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/todolists/${todolistId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const todosetId = this.getNodeParameter('todosetId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'todo') {
					// ----------------------------------
					//         todo
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'create') {
						const todolistId = this.getNodeParameter('todolistId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							content,
							...additionalFields,
						};

						// Handle date formatting
						if (body.due_on) {
							body.due_on = new Date(body.due_on as string).toISOString().split('T')[0];
						}
						if (body.starts_on) {
							body.starts_on = new Date(body.starts_on as string).toISOString().split('T')[0];
						}

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/todolists/${todolistId}/todos.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const todoId = this.getNodeParameter('todoId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/todos/${todoId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const todolistId = this.getNodeParameter('todolistId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						const query: IDataObject = {};
						if (filters.status) {
							query.status = filters.status;
						}
						if (filters.completed) {
							query.completed = filters.completed;
						}

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/todolists/${todolistId}/todos.json`,
								{},
								query,
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/todolists/${todolistId}/todos.json`,
								{},
								query,
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const todoId = this.getNodeParameter('todoId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						// Handle date formatting
						if (updateFields.due_on) {
							updateFields.due_on = new Date(updateFields.due_on as string).toISOString().split('T')[0];
						}
						if (updateFields.starts_on) {
							updateFields.starts_on = new Date(updateFields.starts_on as string).toISOString().split('T')[0];
						}

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/todos/${todoId}.json`,
							updateFields,
							{},
							accountId,
						);
					}

					if (operation === 'delete') {
						const todoId = this.getNodeParameter('todoId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'DELETE',
							`/buckets/${projectId}/todos/${todoId}.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true };
					}

					if (operation === 'complete') {
						const todoId = this.getNodeParameter('todoId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/todos/${todoId}/completion.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true, completed: true };
					}

					if (operation === 'uncomplete') {
						const todoId = this.getNodeParameter('todoId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'DELETE',
							`/buckets/${projectId}/todos/${todoId}/completion.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true, completed: false };
					}
				}

				if (resource === 'message') {
					// ----------------------------------
					//         message
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'create') {
						const messageBoardId = this.getNodeParameter('messageBoardId', i) as string;
						const subject = this.getNodeParameter('subject', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							subject,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const messageId = this.getNodeParameter('messageId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/messages/${messageId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const messageBoardId = this.getNodeParameter('messageBoardId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'comment') {
					// ----------------------------------
					//         comment
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const recordingId = this.getNodeParameter('recordingId', i) as string;

					if (operation === 'create') {
						const content = this.getNodeParameter('content', i) as string;

						const body: IDataObject = {
							content,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/recordings/${recordingId}/comments.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/recordings/${recordingId}/comments.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/recordings/${recordingId}/comments.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'campfire') {
					// ----------------------------------
					//         campfire
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'get') {
						const campfireId = this.getNodeParameter('campfireId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/chats/${campfireId}.json`,
							{},
							{},
							accountId,
						);
					}
				}

				if (resource === 'campfireLine') {
					// ----------------------------------
					//         campfireLine
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const campfireId = this.getNodeParameter('campfireId', i) as string;

					if (operation === 'create') {
						const content = this.getNodeParameter('content', i) as string;

						const body: IDataObject = {
							content,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/chats/${campfireId}/lines.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const lineId = this.getNodeParameter('lineId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/chats/${campfireId}/lines/${lineId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/chats/${campfireId}/lines.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/chats/${campfireId}/lines.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'delete') {
						const lineId = this.getNodeParameter('lineId', i) as string;

						await basecampApiRequest.call(
							this,
							'DELETE',
							`/buckets/${projectId}/chats/${campfireId}/lines/${lineId}.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true };
					}
				}

				if (resource === 'cardTable') {
					// ----------------------------------
					//         cardTable
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'get') {
						const cardTableId = this.getNodeParameter('cardTableId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/card_tables/${cardTableId}.json`,
							{},
							{},
							accountId,
						);
					}
				}

				if (resource === 'card') {
					// ----------------------------------
					//         card
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const cardTableId = this.getNodeParameter('cardTableId', i) as string;

					if (operation === 'create') {
						const columnId = this.getNodeParameter('columnId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							title,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const cardId = this.getNodeParameter('cardId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/card_tables/cards/${cardId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const columnId = this.getNodeParameter('columnId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const cardId = this.getNodeParameter('cardId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/card_tables/cards/${cardId}.json`,
							updateFields,
							{},
							accountId,
						);
					}
				}

				if (resource === 'document') {
					// ----------------------------------
					//         document
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const vaultId = this.getNodeParameter('vaultId', i) as string;

					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const content = this.getNodeParameter('content', i) as string;

						const body: IDataObject = {
							title,
							content,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/vaults/${vaultId}/documents.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const documentId = this.getNodeParameter('documentId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/documents/${documentId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${vaultId}/documents.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${vaultId}/documents.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const documentId = this.getNodeParameter('documentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/documents/${documentId}.json`,
							updateFields,
							{},
							accountId,
						);
					}
				}

				if (resource === 'event') {
					// ----------------------------------
					//         event (activity log)
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/recordings/${projectId}/events.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/recordings/${projectId}/events.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'person') {
					// ----------------------------------
					//         person
					// ----------------------------------

					if (operation === 'get') {
						const personId = this.getNodeParameter('personId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/people/${personId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								'/people.json',
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								'/people.json',
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'getMe') {
						responseData = await basecampApiRequest.call(
							this,
							'GET',
							'/my/profile.json',
							{},
							{},
							accountId,
						);
					}
				}

				if (resource === 'question') {
					// ----------------------------------
					//         question (check-in)
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const questionnaireId = this.getNodeParameter('questionnaireId', i) as string;

					if (operation === 'get') {
						const questionId = this.getNodeParameter('questionId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/questions/${questionId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/questionnaires/${questionnaireId}/questions.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/questionnaires/${questionnaireId}/questions.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'questionAnswer') {
					// ----------------------------------
					//         questionAnswer
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const questionId = this.getNodeParameter('questionId', i) as string;

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/questions/${questionId}/answers.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/questions/${questionId}/answers.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'scheduleEntry') {
					// ----------------------------------
					//         scheduleEntry
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;
					const scheduleId = this.getNodeParameter('scheduleId', i) as string;

					if (operation === 'create') {
						const summary = this.getNodeParameter('summary', i) as string;
						const startsAt = this.getNodeParameter('startsAt', i) as string;
						const endsAt = this.getNodeParameter('endsAt', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							summary,
							starts_at: startsAt,
							ends_at: endsAt,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const scheduleEntryId = this.getNodeParameter('scheduleEntryId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/schedule_entries/${scheduleEntryId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const scheduleEntryId = this.getNodeParameter('scheduleEntryId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/schedule_entries/${scheduleEntryId}.json`,
							updateFields,
							{},
							accountId,
						);
					}
				}

				if (resource === 'template') {
					// ----------------------------------
					//         template
					// ----------------------------------

					if (operation === 'get') {
						const templateId = this.getNodeParameter('templateId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/templates/${templateId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								'/templates.json',
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								'/templates.json',
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'createProject') {
						const templateId = this.getNodeParameter('templateId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
							...additionalFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/templates/${templateId}/project_constructions.json`,
							body,
							{},
							accountId,
						);
					}
				}

				if (resource === 'upload') {
					// ----------------------------------
					//         upload
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'get') {
						const uploadId = this.getNodeParameter('uploadId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/uploads/${uploadId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const vaultId = this.getNodeParameter('vaultId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${vaultId}/uploads.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${vaultId}/uploads.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'vault') {
					// ----------------------------------
					//         vault (folder)
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'create') {
						const parentVaultId = this.getNodeParameter('parentVaultId', i) as string;
						const title = this.getNodeParameter('title', i) as string;

						const body: IDataObject = {
							title,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/vaults/${parentVaultId}/vaults.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'get') {
						const vaultId = this.getNodeParameter('vaultId', i) as string;

						responseData = await basecampApiRequest.call(
							this,
							'GET',
							`/buckets/${projectId}/vaults/${vaultId}.json`,
							{},
							{},
							accountId,
						);
					}

					if (operation === 'getAll') {
						const parentVaultId = this.getNodeParameter('parentVaultId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${parentVaultId}/vaults.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/vaults/${parentVaultId}/vaults.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const vaultId = this.getNodeParameter('vaultId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/vaults/${vaultId}.json`,
							updateFields,
							{},
							accountId,
						);
					}
				}

				if (resource === 'webhook') {
					// ----------------------------------
					//         webhook
					// ----------------------------------
					const projectId = this.getNodeParameter('projectId', i) as string;

					if (operation === 'create') {
						const payloadUrl = this.getNodeParameter('payloadUrl', i) as string;
						const types = this.getNodeParameter('types', i) as string[];

						const body: IDataObject = {
							payload_url: payloadUrl,
							types,
						};

						responseData = await basecampApiRequest.call(
							this,
							'POST',
							`/buckets/${projectId}/webhooks.json`,
							body,
							{},
							accountId,
						);
					}

					if (operation === 'delete') {
						const webhookId = this.getNodeParameter('webhookId', i) as string;

						await basecampApiRequest.call(
							this,
							'DELETE',
							`/buckets/${projectId}/webhooks/${webhookId}.json`,
							{},
							{},
							accountId,
						);
						responseData = { success: true };
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							responseData = await basecampApiRequestAllItems.call(
								this,
								'GET',
								`/buckets/${projectId}/webhooks.json`,
								{},
								{},
								accountId,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = await basecampApiRequest.call(
								this,
								'GET',
								`/buckets/${projectId}/webhooks.json`,
								{},
								{},
								accountId,
							);
							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'update') {
						const webhookId = this.getNodeParameter('webhookId', i) as string;
						const types = this.getNodeParameter('types', i) as string[];
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {
							types,
							...updateFields,
						};

						responseData = await basecampApiRequest.call(
							this,
							'PUT',
							`/buckets/${projectId}/webhooks/${webhookId}.json`,
							body,
							{},
							accountId,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
