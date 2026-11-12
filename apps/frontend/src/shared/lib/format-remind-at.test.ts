import { describe, expect, test } from 'vitest';

import { formatRemindAt } from '@/shared/lib/format-remind-at';

describe('formatRemindAt', () => {
	test('월, 일, 오전/오후, 12시간제 시각으로 보여준다.', () => {
		expect(formatRemindAt(new Date(2030, 0, 2, 10, 5))).toBe('1월 2일 오전 10:05');
		expect(formatRemindAt(new Date(2030, 11, 31, 21, 0))).toBe('12월 31일 오후 9:00');
	});

	test('자정은 오전 12시, 정오는 오후 12시다.', () => {
		expect(formatRemindAt(new Date(2030, 0, 2, 0, 30))).toBe('1월 2일 오전 12:30');
		expect(formatRemindAt(new Date(2030, 0, 2, 12, 0))).toBe('1월 2일 오후 12:00');
	});
});
