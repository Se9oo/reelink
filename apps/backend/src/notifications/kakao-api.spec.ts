import { KakaoApiError, unlinkKakaoUser } from './kakao-api.js';

describe('unlinkKakaoUser', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		process.env.KAKAO_ADMIN_KEY = 'admin-key';
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		delete process.env.KAKAO_ADMIN_KEY;
		vi.unstubAllGlobals();
		fetchMock.mockReset();
	});

	test('어드민 키로 회원번호의 연결을 끊는다', async () => {
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 12345 }), { status: 200 }));

		await unlinkKakaoUser('12345');

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://kapi.kakao.com/v1/user/unlink');
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('KakaoAK admin-key');
		expect(String(init.body)).toBe('target_id_type=user_id&target_id=12345');
	});

	test('이미 연결이 끊긴 사용자(-101)면 성공으로 본다', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ msg: 'NotRegisteredUserException', code: -101 }), { status: 400 }),
		);

		await expect(unlinkKakaoUser('12345')).resolves.toBeUndefined();
	});

	test('그 외 실패는 KakaoApiError로 던진다', async () => {
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: -401 }), { status: 401 }));

		await expect(unlinkKakaoUser('12345')).rejects.toBeInstanceOf(KakaoApiError);
	});
});
