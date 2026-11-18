import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetch } from 'undici';

import { isPublicAddress, publicDispatcher } from './public-dispatcher.js';

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
