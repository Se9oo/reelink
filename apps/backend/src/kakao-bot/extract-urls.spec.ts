import { describe, expect, test } from 'vitest';

import { extractUrls } from './extract-urls.js';

describe('extractUrls', () => {
	test('공유 문구에 섞인 URL만 뽑는다', () => {
		expect(extractUrls('[네이버 뉴스] 제목 https://n.news.naver.com/a/1')).toEqual(['https://n.news.naver.com/a/1']);
	});

	test('여러 URL을 등장 순서대로, 중복 없이 뽑는다', () => {
		expect(extractUrls('https://a.com https://b.com https://a.com')).toEqual(['https://a.com', 'https://b.com']);
	});

	test('URL을 감싼 괄호와 끝에 붙은 문장부호는 빼고 뽑는다', () => {
		expect(extractUrls('(https://a.com/x). 그리고 https://b.com/y, 다음')).toEqual([
			'https://a.com/x',
			'https://b.com/y',
		]);
	});

	test('URL 안의 괄호와 쉼표는 자르지 않는다', () => {
		expect(extractUrls('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)']);
		expect(extractUrls('https://m.search.naver.com/search?q=a,b')).toEqual(['https://m.search.naver.com/search?q=a,b']);
		expect(extractUrls('https://www.google.com/maps/@37.5,127.0,15z')).toEqual([
			'https://www.google.com/maps/@37.5,127.0,15z',
		]);
	});

	test('괄호 안의 괄호 URL은 바깥 괄호만 뺀다', () => {
		expect(extractUrls('(https://en.wikipedia.org/wiki/Foo_(bar))')).toEqual([
			'https://en.wikipedia.org/wiki/Foo_(bar)',
		]);
	});

	test('http/https URL이 없으면 빈 배열', () => {
		expect(extractUrls('링크 없음')).toEqual([]);
		expect(extractUrls('ftp://a.com')).toEqual([]);
	});

	test('한글 경로는 그대로 뽑는다', () => {
		expect(extractUrls('https://ko.wikipedia.org/wiki/카카오')).toEqual(['https://ko.wikipedia.org/wiki/카카오']);
	});

	test('줄바꿈으로 구분된 URL도 뽑는다', () => {
		expect(extractUrls('첫째\nhttps://a.com\n둘째\nhttps://b.com')).toEqual(['https://a.com', 'https://b.com']);
	});
});
