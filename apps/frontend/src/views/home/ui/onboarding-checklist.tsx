'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { IconCheckmarkFill } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { getOnboardingSteps } from '@/views/home/model/onboarding-steps';
import { AddToHomeScreenSheet } from '@/views/home/ui/add-to-home-screen-sheet';

import { KakaoBotLinkDialog } from '@/features/connect-kakao-bot/ui/kakao-bot-link-dialog';
import { browserPushSubscriptionKey, getBrowserSubscription } from '@/features/web-push-notification/lib/browser-push';
import { getPlatform, usePushEnvironment } from '@/features/web-push-notification/lib/push-environment';
import { useSetWebPush } from '@/features/web-push-notification/model/use-set-web-push';

import { linkStatusQueryOptions } from '@/entities/kakao-bot/api/get-link-status';
import { meQueryOptions } from '@/entities/user/api/get-me';

import { promptInstall, useCanPromptInstall } from '@/shared/lib/install-prompt';

const DISMISS_KEY = 'kakao-onboarding-dismissed-at';
const HIDE_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissedRecently() {
	try {
		return Date.now() - Number(window.localStorage.getItem(DISMISS_KEY)) < HIDE_MS;
	} catch {
		return false;
	}
}

function currentPermission(): NotificationPermission {
	return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

export function OnboardingChecklist() {
	const [hidden, setHidden] = useState(isDismissedRecently);
	const environment = usePushEnvironment();
	const canPromptInstall = useCanPromptInstall();
	const turnOn = useSetWebPush();

	const { data: me } = useQuery(meQueryOptions());
	const loggedIn = me?.isGuest === false;
	const canSubscribe = environment === 'desktop' || environment === 'mobile';
	const { data: botStatus } = useQuery({ ...linkStatusQueryOptions(), enabled: loggedIn });
	const { data: subscription } = useQuery({
		queryKey: browserPushSubscriptionKey,
		queryFn: getBrowserSubscription,
		enabled: loggedIn && canSubscribe,
	});

	if (hidden || !loggedIn || !environment || !botStatus || (canSubscribe && subscription === undefined)) {
		return null;
	}

	const platform = getPlatform(navigator);
	const { save, notify } = getOnboardingSteps({
		platform,
		environment,
		botLinked: botStatus.linked,
		subscribed: !!subscription,
		permission: currentPermission(),
	});

	if (save === 'done' && (notify === 'done' || notify === 'hidden')) {
		return null;
	}

	function dismiss() {
		try {
			window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
		} catch {}

		setHidden(true);
	}

	function openBotDialog() {
		overlay.open(({ isOpen, close }) => <KakaoBotLinkDialog open={isOpen} onOpenChange={(open) => !open && close()} />);
	}

	function openGuide() {
		overlay.open(({ isOpen, close }) => (
			<AddToHomeScreenSheet open={isOpen} onOpenChange={(open) => !open && close()} />
		));
	}

	function notifyContent() {
		switch (notify) {
			case 'after-install':
				return { description: '설치 후 켤 수 있어요' };
			case 'guide':
				return {
					description: '홈 화면에 추가하면 받을 수 있어요',
					action: (
						<ActionButton size="small" variant="neutralWeak" onClick={openGuide}>
							방법 보기
						</ActionButton>
					),
				};
			case 'turn-on':
				return {
					description:
						environment === 'desktop' ? '브라우저가 켜져 있을 때만 알림이 와요' : '안 본 링크가 쌓이면 알려드려요',
					action: (
						<ActionButton size="small" variant="brandSolid" loading={turnOn.isPending} onClick={() => turnOn.mutate()}>
							켜기
						</ActionButton>
					),
				};
			default:
				return {};
		}
	}

	return (
		<section
			aria-label="Reelink 시작하기"
			className="flex flex-col gap-3 rounded-[20px] bg-[var(--seed-color-bg-layer-default)] p-4 md:p-5"
		>
			<div className="flex items-center justify-between">
				<p className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">Reelink 시작하기</p>
				<button
					type="button"
					onClick={dismiss}
					className="cursor-pointer text-[13px] text-[var(--seed-color-fg-neutral-muted)]"
				>
					나중에
				</button>
			</div>
			<ol className="flex flex-col gap-3">
				{platform === 'android' ? (
					<Step
						number={1}
						done={save === 'done'}
						title="공유 버튼으로 바로 저장하기"
						description={
							canPromptInstall
								? '홈 화면에 설치하면 공유 목록에 Reelink가 떠요'
								: '크롬 메뉴(⋮)에서 홈 화면에 추가 → 설치를 눌러주세요'
						}
						action={
							canPromptInstall && (
								<ActionButton size="small" variant="brandSolid" onClick={() => promptInstall()}>
									설치하기
								</ActionButton>
							)
						}
					/>
				) : (
					<Step
						number={1}
						done={save === 'done'}
						title="카카오톡으로 링크 저장하기"
						description="Reelink 채팅방에 링크를 보내면 저장돼요"
						action={
							<ActionButton size="small" variant="brandSolid" onClick={openBotDialog}>
								연동하기
							</ActionButton>
						}
					/>
				)}
				{notify !== 'hidden' && (
					<Step
						number={2}
						done={notify === 'done'}
						disabled={notify === 'after-install'}
						title="볼 게 쌓이면 알림 받기"
						{...notifyContent()}
					/>
				)}
			</ol>
		</section>
	);
}

interface StepProps {
	number: number;
	title: string;
	description?: string;
	done: boolean;
	disabled?: boolean;
	action?: ReactNode;
}

function Step({ number, title, description, done, disabled, action }: StepProps) {
	return (
		<li className="flex items-center gap-2.5">
			<span
				className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${
					done
						? 'bg-[var(--seed-color-bg-positive-solid)] text-white'
						: 'border-[1.5px] border-[var(--seed-color-stroke-neutral-muted)] text-[var(--seed-color-fg-neutral-muted)]'
					}`}
			>
				{done ? <IconCheckmarkFill size={12} aria-label="완료" /> : number}
			</span>
			<div className="min-w-0 flex-1">
				<p
					className={`text-sm font-semibold break-keep ${
						done
							? 'text-[var(--seed-color-fg-neutral-subtle)] line-through'
							: disabled
								? 'text-[var(--seed-color-fg-neutral-subtle)]'
								: 'text-[var(--seed-color-fg-neutral)]'
						}`}
				>
					{title}
				</p>
				{!done && <p className="text-[13px] break-keep text-[var(--seed-color-fg-neutral-muted)]">{description}</p>}
			</div>
			{!done && action}
		</li>
	);
}
