import { describe, expect, test } from 'vitest';

import { isValidHttpUrl } from '@/shared/lib/is-valid-http-url';

describe('isValidHttpUrl', () => {
	test('http와 https 주소는 유효하다', () => {
		expect(isValidHttpUrl('https://react.dev/blog')).toBe(true);
		expect(isValidHttpUrl('http://n.news.naver.com/article/1')).toBe(true);
	});

	test('스킴이 없거나 다른 스킴이거나 주소 형식이 아니면 유효하지 않다', () => {
		expect(isValidHttpUrl('react.dev')).toBe(false);
		expect(isValidHttpUrl('ftp://example.com')).toBe(false);
		expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isValidHttpUrl('그냥 텍스트')).toBe(false);
		expect(isValidHttpUrl('')).toBe(false);
	});
});
