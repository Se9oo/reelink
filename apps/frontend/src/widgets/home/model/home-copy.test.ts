import { describe, expect, test } from 'vitest';

import { greetingFor, subGreetingFor } from '@/widgets/home/model/home-copy';

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
	test('안 본 링크 수가 0개라면 "새로 저장한 링크를 둘러볼까요?" 문구가 출력된다', () => {
		expect(subGreetingFor(0)).toBe('새로 저장한 링크를 둘러볼까요?');
	});

	test('안 본 링크 수가 N개라면 "오늘은 오래된 링크 N개만 정리해볼까요?" 문구가 출력된다', () => {
		expect(subGreetingFor(1)).toBe('오늘은 오래된 링크 1개만 정리해볼까요?');
		expect(subGreetingFor(3)).toBe('오늘은 오래된 링크 3개만 정리해볼까요?');
	});

	test('안 본 링크 수가 3개를 넘으면 최대 3개로 제한한다', () => {
		expect(subGreetingFor(12)).toBe('오늘은 오래된 링크 3개만 정리해볼까요?');
	});
});
