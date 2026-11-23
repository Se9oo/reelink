import { describe, expect, test } from 'vitest';

import { extractSharedUrl } from '@/views/share/model/extract-shared-url';

describe('extractSharedUrl', () => {
	test('url 값이 있으면 그 주소를 쓴다', () => {
		expect(extractSharedUrl({ url: 'https://youtu.be/abc', text: 'https://other.com' })).toBe('https://youtu.be/abc');
	});

	test('url이 없으면 공유 문구가 섞인 text에서 첫 주소를 뽑는다', () => {
		expect(extractSharedUrl({ text: '이 영상 봐봐 https://youtu.be/abc?si=x 재밌음' })).toBe(
			'https://youtu.be/abc?si=x',
		);
	});

	test('주소 끝에 붙은 문장부호는 뗀다', () => {
		expect(extractSharedUrl({ text: '여기(https://www.instagram.com/reel/C9x/).' })).toBe(
			'https://www.instagram.com/reel/C9x/',
		);
	});

	test('text에도 없으면 title에서 찾는다', () => {
		expect(extractSharedUrl({ title: 'https://n.news.naver.com/a/1' })).toBe('https://n.news.naver.com/a/1');
	});

	test('http/https 주소가 없으면 null', () => {
		expect(extractSharedUrl({ url: 'intent://x', text: '그냥 텍스트' })).toBeNull();
		expect(extractSharedUrl({})).toBeNull();
	});
});
