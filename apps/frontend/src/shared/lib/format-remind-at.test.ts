import { describe, expect, test } from 'vitest';

import { formatRemindAt } from '@/shared/lib/format-remind-at';

const NOW = new Date(2030, 5, 1, 9, 0);

describe('formatRemindAt', () => {
	test('월, 일, 오전/오후, 12시간제 시각으로 보여준다.', () => {
		expect(formatRemindAt(new Date(2030, 0, 2, 10, 5), NOW)).toBe('1월 2일 오전 10:05');
		expect(formatRemindAt(new Date(2030, 11, 31, 21, 0), NOW)).toBe('12월 31일 오후 9:00');
	});

	test('자정은 오전 12시, 정오는 오후 12시다.', () => {
		expect(formatRemindAt(new Date(2030, 0, 2, 0, 30), NOW)).toBe('1월 2일 오전 12:30');
		expect(formatRemindAt(new Date(2030, 0, 2, 12, 0), NOW)).toBe('1월 2일 오후 12:00');
	});

	test('올해가 아니면 연도를 앞에 붙인다.', () => {
		expect(formatRemindAt(new Date(2031, 0, 2, 10, 5), NOW)).toBe('2031년 1월 2일 오전 10:05');
		expect(formatRemindAt(new Date(2029, 11, 31, 21, 0), NOW)).toBe('2029년 12월 31일 오후 9:00');
	});
});
