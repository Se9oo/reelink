import { useSyncExternalStore } from 'react';

export type PushEnvironment = 'unsupported' | 'install-required' | 'mobile' | 'desktop';

interface PushEnvironmentInput {
	supported: boolean;
	standalone: boolean;
	userAgent: string;
	maxTouchPoints: number;
	mobile?: boolean;
}

export function getPushEnvironment({
	supported,
	standalone,
	userAgent,
	maxTouchPoints,
	mobile,
}: PushEnvironmentInput): PushEnvironment {
	const isMobile =
		mobile === true || /Android|iPhone|iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

	if (isMobile && !standalone) {
		return 'install-required';
	}

	if (!supported) {
		return 'unsupported';
	}

	return isMobile ? 'mobile' : 'desktop';
}

export function readPushEnvironment(): PushEnvironment {
	const nav = navigator as Navigator & { userAgentData?: { mobile: boolean }; standalone?: boolean };

	return getPushEnvironment({
		supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
		standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
		userAgent: navigator.userAgent,
		maxTouchPoints: navigator.maxTouchPoints,
		mobile: nav.userAgentData?.mobile,
	});
}

const subscribeNothing = () => () => {};

export function usePushEnvironment() {
	return useSyncExternalStore(subscribeNothing, readPushEnvironment, () => null);
}
