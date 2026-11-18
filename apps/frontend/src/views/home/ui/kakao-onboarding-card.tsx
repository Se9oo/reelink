'use client';

import { useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { IconAndroidshareLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { KakaoBotLinkDialog } from '@/features/connect-kakao-bot/ui/kakao-bot-link-dialog';
import { useConnectKakaoNotification } from '@/features/connect-kakao-notification/model/use-connect-kakao-notification';

import { linkStatusQueryOptions } from '@/entities/kakao-bot/api/get-link-status';
import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';
import { meQueryOptions } from '@/entities/user/api/get-me';

const DISMISS_KEY = 'kakao-onboarding-dismissed-at';
const HIDE_MS = 7 * 24 * 60 * 60 * 1000;

function openLinkDialog() {
	overlay.open(({ isOpen, close }) => <KakaoBotLinkDialog open={isOpen} onOpenChange={(open) => !open && close()} />);
}

function isDismissedRecently() {
	try {
		return Date.now() - Number(window.localStorage.getItem(DISMISS_KEY)) < HIDE_MS;
	} catch {
		return false;
	}
}

export function KakaoOnboardingCard() {
	const searchParams = useSearchParams();
	const [resumeBot] = useState(() => searchParams?.get('onboarding') === 'bot');
	const [hidden, setHidden] = useState(isDismissedRecently);
	const resumed = useRef(false);
	const connect = useConnectKakaoNotification();

	const { data: me } = useQuery(meQueryOptions());
	const loggedIn = me?.isGuest === false;
	const { data: settings } = useQuery({ ...notificationSettingsQueryOptions(), enabled: loggedIn });
	const { data: botStatus } = useQuery({ ...linkStatusQueryOptions(), enabled: loggedIn });

	useEffect(() => {
		const url = new URL(window.location.href);

		if (!url.searchParams.has('onboarding')) {
			return;
		}

		url.searchParams.delete('onboarding');
		window.history.replaceState(null, '', url);
	}, []);

	useEffect(() => {
		if (!resumeBot || !botStatus || resumed.current) {
			return;
		}

		resumed.current = true;

		if (!botStatus.linked) {
			openLinkDialog();
		}
	}, [resumeBot, botStatus]);

	function start() {
		if (settings?.kakaoStatus !== 'active') {
			connect.mutate({ from: 'onboarding' });
			return;
		}

		openLinkDialog();
	}

	function dismiss() {
		try {
			window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
		} catch {}

		setHidden(true);
	}

	if (hidden || !settings || !botStatus || botStatus.linked) {
		return null;
	}

	return (
		<section
			aria-label="카카오톡 연동 안내"
			className="flex flex-col gap-3.5 rounded-[20px] bg-[var(--seed-color-bg-layer-default)] p-4 md:flex-row
				md:items-center md:justify-between md:gap-5 md:p-5"
		>
			<div className="min-w-0">
				<p className="flex items-center gap-1.5 text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">
					<IconAndroidshareLine size={18} aria-hidden />
					공유 버튼으로 바로 저장하기
				</p>
				<p className="mt-1.5 text-sm break-keep text-[var(--seed-color-fg-neutral-muted)]">
					카카오톡을 연동하면 유튜브, 인스타에서 공유 버튼만 눌러도 링크가 저장되고, 안 본 링크는 카톡으로 다시
					알려드려요
				</p>
			</div>
			<div className="flex shrink-0 justify-end gap-2">
				<ActionButton size="medium" variant="neutralWeak" onClick={dismiss}>
					나중에
				</ActionButton>
				<ActionButton size="medium" variant="brandSolid" loading={connect.isPending} onClick={start}>
					연동하기
				</ActionButton>
			</div>
		</section>
	);
}
