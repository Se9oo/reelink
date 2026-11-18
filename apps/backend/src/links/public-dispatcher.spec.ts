import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Agent, fetch } from 'undici';

import { isPublicAddress, MAX_RESPONSE_SIZE, publicDispatcher } from './public-dispatcher.js';

describe('isPublicAddress', () => {
	test.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('%s는 공개 주소다', (address) => {
		expect(isPublicAddress(address)).toBe(true);
	});

	test.each([
		'127.0.0.1',
		'10.1.2.3',
		'172.16.0.1',
		'192.168.0.1',
		'169.254.169.254',
		'100.64.0.1',
		'0.0.0.0',
		'::1',
		'fd00::1',
		'fe80::1',
		'::ffff:127.0.0.1',
		'not-an-ip',
	])('%s는 공개 주소가 아니다', (address) => {
		expect(isPublicAddress(address)).toBe(false);
	});
});

describe('publicDispatcher', () => {
	let server: Server;
	let port: number;

	beforeAll(async () => {
		server = createServer((_, res) => res.end('ok'));
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(() => {
		server.close();
	});

	test('dispatcher 없이는 로컬 서버에 닿는다', async () => {
		const res = await fetch(`http://127.0.0.1:${port}`);

		expect(await res.text()).toBe('ok');
	});

	test('IP로 적은 내부 주소에는 연결하지 않는다', async () => {
		await expect(fetch(`http://127.0.0.1:${port}`, { dispatcher: publicDispatcher })).rejects.toMatchObject({
			cause: { message: expect.stringContaining('내부 주소로는 요청하지 않습니다') },
		});
	});

	test('DNS 결과가 내부 주소인 호스트에는 연결하지 않는다', async () => {
		await expect(fetch(`http://localhost:${port}`, { dispatcher: publicDispatcher })).rejects.toMatchObject({
			cause: { message: expect.stringContaining('내부 주소로는 요청하지 않습니다') },
		});
	});
});

describe('MAX_RESPONSE_SIZE', () => {
	let server: Server;
	let port: number;
	const sizeLimited = new Agent({ maxResponseSize: MAX_RESPONSE_SIZE });

	beforeAll(async () => {
		server = createServer((req, res) => {
			const total = req.url === '/large' ? MAX_RESPONSE_SIZE + 1024 : 1024 * 1024;
			const chunk = Buffer.alloc(64 * 1024, 'a');

			for (let sent = 0; sent < total; sent += chunk.length) {
				res.write(chunk);
			}
			res.end();
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(async () => {
		server.close();
		await sizeLimited.close();
	});

	test('한도보다 작은 응답은 끝까지 받는다', async () => {
		const res = await fetch(`http://127.0.0.1:${port}/small`, { dispatcher: sizeLimited });

		expect((await res.arrayBuffer()).byteLength).toBe(1024 * 1024);
	});

	test('Content-Length 없이 보내도 한도를 넘으면 받다가 끊는다', async () => {
		await expect(
			fetch(`http://127.0.0.1:${port}/large`, { dispatcher: sizeLimited }).then((res) => res.arrayBuffer()),
		).rejects.toMatchObject({ cause: { code: 'UND_ERR_RES_EXCEEDED_MAX_SIZE' } });
	});
});
