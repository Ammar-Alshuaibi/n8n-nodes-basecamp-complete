import type { IDataObject } from 'n8n-workflow';

export async function postJson(url: string, body: IDataObject, headers: Record<string, string>): Promise<IDataObject> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...headers,
		},
		body: JSON.stringify(body),
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
	}

	if (!text) {
		return {};
	}

	return JSON.parse(text) as IDataObject;
}
