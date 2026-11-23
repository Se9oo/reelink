import { describe, expect, test } from 'vitest';

import { getOnboardingSteps } from '@/views/home/model/onboarding-steps';

const base = { guest: false, botLinked: false, subscribed: false, permission: 'default' as const };

describe('getOnboardingSteps', () => {
	test('안드로이드 브라우저 탭: 설치하기, 알림은 설치 후', () => {
		expect(getOnboardingSteps({ ...base, platform: 'android', environment: 'install-required' })).toEqual({
			save: 'install',
			notify: 'after-install',
		});
	});

	test('안드로이드 설치한 앱: 저장은 완료, 알림 켜기', () => {
		expect(getOnboardingSteps({ ...base, platform: 'android', environment: 'mobile' })).toEqual({
			save: 'done',
			notify: 'turn-on',
		});
	});

	test('아이폰 사파리 탭: 봇 연동, 알림은 홈 화면 추가 안내', () => {
		expect(getOnboardingSteps({ ...base, platform: 'ios', environment: 'install-required' })).toEqual({
			save: 'link-bot',
			notify: 'guide',
		});
	});

	test('봇이 연동돼 있고 구독이 있으면 둘 다 완료', () => {
		expect(
			getOnboardingSteps({ ...base, platform: 'desktop', environment: 'desktop', botLinked: true, subscribed: true }),
		).toEqual({ save: 'done', notify: 'done' });
	});

	test('알림 권한을 거부했으면 일부러 끈 것으로 보고 알림 줄을 숨긴다', () => {
		expect(
			getOnboardingSteps({ ...base, platform: 'desktop', environment: 'desktop', permission: 'denied' }).notify,
		).toBe('hidden');
	});

	test('게스트 안드로이드: 설치는 그대로 안내하고 알림은 로그인으로 유도한다', () => {
		expect(getOnboardingSteps({ ...base, guest: true, platform: 'android', environment: 'install-required' })).toEqual({
			save: 'install',
			notify: 'login',
		});
	});

	test('게스트 아이폰, 데스크톱: 봇 연동 줄은 숨기고 알림은 로그인으로 유도한다', () => {
		expect(getOnboardingSteps({ ...base, guest: true, platform: 'ios', environment: 'install-required' })).toEqual({
			save: 'hidden',
			notify: 'login',
		});
		expect(getOnboardingSteps({ ...base, guest: true, platform: 'desktop', environment: 'desktop' })).toEqual({
			save: 'hidden',
			notify: 'login',
		});
	});

	test('알림을 지원하지 않는 브라우저면 알림 줄을 숨긴다', () => {
		expect(getOnboardingSteps({ ...base, platform: 'desktop', environment: 'unsupported' }).notify).toBe('hidden');
	});
});
