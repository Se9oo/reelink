import { describe, expect, test } from 'vitest';

import { buildLinkAlarmMessage, buildReminderMessage } from './build-reminder-message.js';

describe('buildReminderMessage', () => {
	test('링크 개수와 제목을 목록으로 나열한다', () => {
		expect(buildReminderMessage(['리액트 19 정리', '성수 카페 추천'])).toBe(
			'안 본 링크 2개가 기다려요\n· 리액트 19 정리\n· 성수 카페 추천',
		);
	});

	test('긴 제목은 잘라서 말줄임표를 붙인다', () => {
		const message = buildReminderMessage(['가'.repeat(50)]);

		expect(message).toBe(`안 본 링크 1개가 기다려요\n· ${'가'.repeat(20)}…`);
	});

	test('이모지는 중간에서 쪼개지 않고 통째로 자른다', () => {
		const family = '👨‍👩‍👧';
		const message = buildReminderMessage([family.repeat(5)]);

		expect(message).toBe(`안 본 링크 1개가 기다려요\n· ${family.repeat(2)}…`);
	});

	test('5개를 넘으면 5개만 나열하고 나머지는 외 N건으로 줄인다', () => {
		const titles = ['1', '2', '3', '4', '5', '6', '7'];

		expect(buildReminderMessage(titles)).toBe(
			'안 본 링크 7개가 기다려요\n· 1\n· 2\n· 3\n· 4\n· 5\n외 2건은 피드에서 확인하세요',
		);
	});

	test('제목이 길고 링크가 많아도 카카오 텍스트 제한(200자)을 넘지 않는다', () => {
		const titles = Array.from({ length: 100000 }, () => '👨‍👩‍👧'.repeat(100));

		expect(buildReminderMessage(titles).length).toBeLessThanOrEqual(200);
	});
});

describe('buildLinkAlarmMessage', () => {
	test('제목과 저장 이유를 담는다', () => {
		expect(buildLinkAlarmMessage('콘서트 티켓팅', '금요일 8시 오픈')).toBe(
			'⏰ 지정한 알림 시간이에요\n콘서트 티켓팅\n금요일 8시 오픈',
		);
	});

	test('저장 이유가 없으면 제목만 담는다', () => {
		expect(buildLinkAlarmMessage('콘서트 티켓팅', null)).toBe('⏰ 지정한 알림 시간이에요\n콘서트 티켓팅');
	});

	test('가장 긴 제목과 저장 이유를 넣어도 200자를 넘지 않는다', () => {
		expect(buildLinkAlarmMessage('가'.repeat(500), '나'.repeat(500)).length).toBeLessThanOrEqual(200);
	});
});
