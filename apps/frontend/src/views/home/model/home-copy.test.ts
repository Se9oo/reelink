import { describe, expect, test } from 'vitest';

import { greetingFor, subGreetingFor } from '@/views/home/model/home-copy';

describe('greetingFor', () => {
	test('5~11시는 아침 인사를 한다', () => {
		expect(greetingFor(5)).toBe('좋은 아침이에요');
		expect(greetingFor(11)).toBe('좋은 아침이에요');
	});

	test('12~17시는 오후 인사를 한다', () => {
		expect(greetingFor(12)).toBe('좋은 오후예요');
		expect(greetingFor(17)).toBe('좋은 오후예요');
	});

	test('18~21시는 저녁인사를 한다', () => {
		expect(greetingFor(18)).toBe('좋은 저녁이에요');
		expect(greetingFor(21)).toBe('좋은 저녁이에요');
	});

	test('22~04시는 늦은 시간이네요를 출력한다', () => {
		expect(greetingFor(22)).toBe('늦은 시간이네요');
		expect(greetingFor(4)).toBe('늦은 시간이네요');
	});
});

describe('subGreetingFor', () => {
	test('2주 넘게 안 본 링크가 있으면 오래 쌓인 링크부터 정리하자고 한다', () => {
		expect(subGreetingFor({ staleCount: 2, unviewedCount: 9 })).toBe('오래 쌓인 링크 2개부터 정리해볼까요?');
	});

	test('안 본 링크가 모두 최근 것이면 오래됐다고 하지 않고 먼저 보자고 한다', () => {
		expect(subGreetingFor({ staleCount: 0, unviewedCount: 1 })).toBe('안 본 링크 1개만 먼저 볼까요?');
	});

	test('안 본 링크가 3개를 넘으면 3개까지만 권한다', () => {
		expect(subGreetingFor({ staleCount: 0, unviewedCount: 12 })).toBe('안 본 링크 3개만 먼저 볼까요?');
	});

	test('안 본 링크가 없으면 새 링크를 저장하자고 한다', () => {
		expect(subGreetingFor({ staleCount: 0, unviewedCount: 0 })).toBe('다 봤어요! 새로 본 링크를 저장해보세요');
	});
});
