import { describe, expect, test } from 'vitest';

import { collectReminders, MAX_WAIT_MS, splitReminders } from '@/entities/link/model/remind-expiry';

const now = new Date('2026-11-23T12:00:00Z');

describe('collectReminders', () => {
	test('홈 요약처럼 중첩된 데이터에서 알림 시각이 있는 링크만 모은다', () => {
		const home = {
			upcoming: [{ id: 'a', thumbnailUrl: null, remindAt: '2026-11-23T13:00:00Z' }],
			recent: [
				{ id: 'a', thumbnailUrl: null, remindAt: '2026-11-23T13:00:00Z' },
				{ id: 'b', thumbnailUrl: null, remindAt: null },
			],
		};

		expect(collectReminders(home)).toEqual([
			{ id: 'a', remindAt: '2026-11-23T13:00:00Z' },
			{ id: 'a', remindAt: '2026-11-23T13:00:00Z' },
		]);
	});
});

describe('splitReminders', () => {
	test('지난 알림의 링크 id와, 가장 가까운 다음 알림까지 남은 시간을 돌려준다', () => {
		const result = splitReminders(
			[
				{ id: 'past', remindAt: '2026-11-23T11:59:00Z' },
				{ id: 'now', remindAt: '2026-11-23T12:00:00Z' },
				{ id: 'soon', remindAt: '2026-11-23T12:10:00Z' },
				{ id: 'later', remindAt: '2026-11-23T12:30:00Z' },
			],
			now,
		);

		expect(result).toEqual({ expiredIds: ['past', 'now'], nextDelayMs: 10 * 60 * 1000 });
	});

	test('다음 알림이 아주 멀어도 최대 대기 시간 뒤에 다시 계산한다', () => {
		expect(splitReminders([{ id: 'far', remindAt: '2027-03-01T00:00:00Z' }], now).nextDelayMs).toBe(MAX_WAIT_MS);
	});

	test('남은 알림이 없으면 기다리지 않는다', () => {
		expect(splitReminders([{ id: 'past', remindAt: '2026-11-23T11:00:00Z' }], now)).toEqual({
			expiredIds: ['past'],
			nextDelayMs: null,
		});
	});
});
