import { describe, expect, test } from 'vitest';

import { getPushEnvironment } from '@/features/web-push-notification/lib/push-environment';

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';

const desktop = { userAgent: MAC, maxTouchPoints: 0 };

describe('getPushEnvironment', () => {
	test('데스크톱은 브라우저 탭에서도 구독할 수 있다.', () => {
		expect(getPushEnvironment({ ...desktop, supported: true, standalone: false })).toBe('desktop');
		expect(
			getPushEnvironment({ userAgent: WINDOWS, maxTouchPoints: 10, mobile: false, supported: true, standalone: false }),
		).toBe('desktop');
	});

	test('휴대폰 브라우저 탭은 웹 푸시를 지원해도 홈 화면 설치를 먼저 안내한다.', () => {
		expect(
			getPushEnvironment({ userAgent: ANDROID_PHONE, maxTouchPoints: 5, supported: true, standalone: false }),
		).toBe('install-required');
		expect(getPushEnvironment({ userAgent: IPHONE, maxTouchPoints: 5, supported: false, standalone: false })).toBe(
			'install-required',
		);
	});

	test('태블릿도 휴대폰처럼 홈 화면 설치를 먼저 안내한다.', () => {
		expect(
			getPushEnvironment({
				userAgent: ANDROID_TABLET,
				maxTouchPoints: 5,
				mobile: false,
				supported: true,
				standalone: false,
			}),
		).toBe('install-required');
		expect(getPushEnvironment({ userAgent: MAC, maxTouchPoints: 5, supported: false, standalone: false })).toBe(
			'install-required',
		);
	});

	test('홈 화면에 설치한 휴대폰, 태블릿 PWA는 구독할 수 있다.', () => {
		expect(getPushEnvironment({ userAgent: IPHONE, maxTouchPoints: 5, supported: true, standalone: true })).toBe(
			'mobile',
		);
		expect(getPushEnvironment({ userAgent: MAC, maxTouchPoints: 5, supported: true, standalone: true })).toBe('mobile');
	});

	test('userAgentData.mobile이 true면 User-Agent와 상관없이 모바일이다.', () => {
		expect(getPushEnvironment({ ...desktop, mobile: true, supported: true, standalone: false })).toBe(
			'install-required',
		);
	});

	test('웹 푸시를 지원하지 않으면 unsupported다.', () => {
		expect(getPushEnvironment({ ...desktop, supported: false, standalone: false })).toBe('unsupported');
		expect(getPushEnvironment({ userAgent: IPHONE, maxTouchPoints: 5, supported: false, standalone: true })).toBe(
			'unsupported',
		);
	});
});
