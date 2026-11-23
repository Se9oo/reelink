import type { Platform, PushEnvironment } from '@/features/web-push-notification/lib/push-environment';

export type SaveStep = 'install' | 'link-bot' | 'done';
export type NotifyStep = 'after-install' | 'guide' | 'turn-on' | 'done' | 'hidden';

interface OnboardingInput {
	platform: Platform;
	environment: PushEnvironment;
	botLinked: boolean;
	subscribed: boolean;
	permission: NotificationPermission;
}

function getSaveStep({ platform, environment, botLinked }: OnboardingInput): SaveStep {
	if (platform === 'android') {
		return environment === 'install-required' ? 'install' : 'done';
	}

	return botLinked ? 'done' : 'link-bot';
}

function getNotifyStep({ platform, environment, subscribed, permission }: OnboardingInput): NotifyStep {
	if (subscribed) {
		return 'done';
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
