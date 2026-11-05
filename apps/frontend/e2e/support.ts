import { type APIRequestContext, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { Client } from 'pg';

process.loadEnvFile(path.resolve('../backend/.env.local'));

export const API_URL = 'http://localhost:8080';

async function query(sql: string, params: unknown[]) {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		await client.query(sql, params);
	} finally {
		await client.end();
	}
}

export async function signIn(context: BrowserContext): Promise<string> {
	await context.request.post(`${API_URL}/auth/guest`);
	const me = await (await context.request.get(`${API_URL}/auth/me`)).json();
	await query("update users set is_guest = false, nickname = 'E2E' where id = $1", [me.id]);
	return me.id;
}

export async function deleteUser(userId: string) {
	await query('delete from users where id = $1', [userId]);
}

export async function sendKakaoMessage(request: APIRequestContext, botUserKey: string, utterance: string) {
	const res = await request.post(`${API_URL}/webhook/kakao`, {
		headers: { 'x-webhook-secret': process.env.KAKAO_WEBHOOK_SECRET ?? '' },
		data: { userRequest: { utterance, user: { id: botUserKey } } },
	});
	const body = await res.json();
	return body.template.outputs[0].simpleText.text as string;
}
