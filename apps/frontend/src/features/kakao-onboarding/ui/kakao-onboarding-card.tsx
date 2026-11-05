'use client';

import { useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { KakaoBotLinkDialog } from '@/features/connect-kakao-bot/ui/kakao-bot-link-dialog';
import { useConnectKakaoNotification } from '@/features/connect-kakao-notification/model/use-connect-kakao-notification';

import { linkStatusQueryOptions } from '@/entities/kakao-bot/api/get-link-status';
import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';

type Mode = 'none' | 'card' | 'resumeBot';

function openLinkDialog() {
	overlay.open(({ isOpen, close }) => <KakaoBotLinkDialog open={isOpen} onOpenChange={(open) => !open && close()} />);
}

function modeFrom(searchParams: URLSearchParams | null): Mode {
	if (searchParams?.get('welcome') === '1') {
		return 'card';
	}

	return searchParams?.get('onboarding') === 'bot' ? 'resumeBot' : 'none';
}

export function KakaoOnboardingCard() {
	const searchParams = useSearchParams();
	const [mode, setMode] = useState<Mode>(() => modeFrom(searchParams));
	const resumed = useRef(false);
	const connect = useConnectKakaoNotification();

	const { data: settings } = useQuery({ ...notificationSettingsQueryOptions(), enabled: mode !== 'none' });
	const { data: botStatus } = useQuery({ ...linkStatusQueryOptions(), enabled: mode !== 'none' });

	useEffect(() => {
		const url = new URL(window.location.href);

		if (!url.searchParams.has('welcome') && !url.searchParams.has('onboarding')) {
			return;
		}

		url.searchParams.delete('welcome');
		url.searchParams.delete('onboarding');
		window.history.replaceState(null, '', url);
	}, []);

	useEffect(() => {
		if (mode !== 'resumeBot' || !botStatus || resumed.current) {
			return;
		}

		resumed.current = true;

		if (!botStatus.linked) {
			openLinkDialog();
		}
	}, [mode, botStatus]);

	function start() {
		if (settings?.kakaoStatus !== 'active') {
			connect.mutate({ from: 'onboarding' });
			return;
		}

		setMode('none');

		if (!botStatus?.linked) {
			openLinkDialog();
		}
	}

	if (mode !== 'card') {
		return null;
	}

	return (
		<section
			aria-label="카카오톡 연동 안내"
			className="flex flex-col gap-3 rounded-[20px] bg-[var(--seed-color-bg-layer-default)] p-4 md:flex-row
				md:items-center md:justify-between md:p-5"
		>
			<div className="min-w-0">
				<p className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">💬 카카오톡으로 더 편하게 쓰기</p>
				<p className="mt-0.5 text-sm break-keep text-[var(--seed-color-fg-neutral-subtle)]">
					링크는 봇에게, 리마인드는 나에게 보내기로
				</p>
			</div>
			<div className="flex shrink-0 justify-end gap-2">
				<ActionButton size="small" variant="neutralWeak" onClick={() => setMode('none')}>
					나중에
				</ActionButton>
				<ActionButton
					size="small"
					variant="brandSolid"
					loading={!settings || !botStatus || connect.isPending}
					onClick={start}
				>
					시작하기
				</ActionButton>
			</div>
		</section>
	);
}
