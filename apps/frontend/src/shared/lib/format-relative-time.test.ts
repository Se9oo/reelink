import { describe, expect, test } from 'vitest';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';

const now = new Date('2026-10-19T12:00:00Z');

function ago(ms: number) {
	return new Date(now.getTime() - ms).toISOString();
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
	test('1분 미만은 방금으로 보여준다', () => {
		expect(formatRelativeTime(ago(30 * 1000), now)).toBe('방금');
	});

	test('1시간 미만은 분, 하루 미만은 시간 단위로 보여준다', () => {
		expect(formatRelativeTime(ago(5 * MINUTE), now)).toBe('5분 전');
		expect(formatRelativeTime(ago(3 * HOUR), now)).toBe('3시간 전');
	});

	test('하루는 어제, 일주일 미만은 일 단위로 보여준다', () => {
		expect(formatRelativeTime(ago(DAY), now)).toBe('어제');
		expect(formatRelativeTime(ago(6 * DAY), now)).toBe('6일 전');
	});

	test('한 달 미만은 주, 1년 미만은 개월, 그 이상은 년 단위로 보여준다', () => {
		expect(formatRelativeTime(ago(7 * DAY), now)).toBe('1주 전');
		expect(formatRelativeTime(ago(29 * DAY), now)).toBe('4주 전');
		expect(formatRelativeTime(ago(30 * DAY), now)).toBe('1개월 전');
		expect(formatRelativeTime(ago(330 * DAY), now)).toBe('11개월 전');
		expect(formatRelativeTime(ago(364 * DAY), now)).toBe('11개월 전');
		expect(formatRelativeTime(ago(400 * DAY), now)).toBe('1년 전');
	});

	test('미래 시각은 방금으로 보여준다', () => {
		expect(formatRelativeTime(ago(-5 * MINUTE), now)).toBe('방금');
	});
});
