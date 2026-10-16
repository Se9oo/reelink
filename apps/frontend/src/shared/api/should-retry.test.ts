import { HTTPError } from 'ky';
import { describe, expect, test } from 'vitest';

import { shouldRetry } from '@/shared/api/should-retry';

function httpError(status: number) {
	return new HTTPError(
		new Response(null, { status }),
		new Request('http://localhost/test'),
		{} as ConstructorParameters<typeof HTTPError>[2],
	);
}

describe('shouldRetry', () => {
	test('404 응답은 재시도하지 않는다', () => {
		expect(shouldRetry(0, httpError(404))).toBe(false);
	});

	test('그 외 HTTP 오류와 네트워크 오류는 3번까지 재시도한다', () => {
		expect(shouldRetry(0, httpError(500))).toBe(true);
		expect(shouldRetry(2, new Error('network'))).toBe(true);
		expect(shouldRetry(3, new Error('network'))).toBe(false);
	});
});
