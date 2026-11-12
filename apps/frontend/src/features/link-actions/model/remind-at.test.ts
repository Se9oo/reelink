import { describe, expect, test } from 'vitest';

import { partsToRemindAt, remindAtToParts, tenMinutesLater } from '@/features/link-actions/model/remind-at';

describe('remindAtToParts, partsToRemindAt', () => {
	test('Date를 달력 날짜와 24시간제 시각으로 나누고, 다시 합치면 같은 분이 된다.', () => {
		const date = new Date(2030, 0, 2, 21, 7);
		const parts = remindAtToParts(date);

		expect(parts).toEqual({ date: { year: 2030, month: 1, day: 2 }, time: { hour: 21, minute: 7 } });
		expect(partsToRemindAt(parts.date, parts.time).getTime()).toBe(date.getTime());
	});
});

describe('tenMinutesLater', () => {
	test('지금부터 10분 뒤를 초는 버리고 분 단위로 반환한다.', () => {
		expect(tenMinutesLater(new Date(2030, 0, 1, 15, 20, 30))).toEqual(new Date(2030, 0, 1, 15, 30));
	});

	test('밤 11시 55분이면 다음 날 0시 5분이다.', () => {
		expect(tenMinutesLater(new Date(2030, 0, 31, 23, 55))).toEqual(new Date(2030, 1, 1, 0, 5));
	});
});
