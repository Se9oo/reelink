import type { Platform, PushEnvironment } from '@/features/web-push-notification/lib/push-environment';

export type SaveStep = 'install' | 'link-bot' | 'done' | 'hidden';
export type NotifyStep = 'after-install' | 'guide' | 'turn-on' | 'login' | 'done' | 'hidden';

interface OnboardingInput {
	platform: Platform;
	environment: PushEnvironment;
	guest: boolean;
	botLinked: boolean;
	subscribed: boolean;
	permission: NotificationPermission;
}

function getSaveStep({ platform, environment, guest, botLinked }: OnboardingInput): SaveStep {
	if (platform === 'android') {
		return environment === 'install-required' ? 'install' : 'done';
	}

	if (guest) {
		return 'hidden';
	}

	return botLinked ? 'done' : 'link-bot';
}

function getNotifyStep({ platform, environment, guest, subscribed, permission }: OnboardingInput): NotifyStep {
	if (subscribed) {
		return 'done';
	}

	if (guest) {
		return 'login';
	}

	if (environment === 'install-required') {
		return platform === 'android' ? 'after-install' : 'guide';
	}

	if (environment === 'unsupported' || permission === 'denied') {
		return 'hidden';
	}

	return 'turn-on';
}

export function getOnboardingSteps(input: OnboardingInput) {
	return { save: getSaveStep(input), notify: getNotifyStep(input) };
}
