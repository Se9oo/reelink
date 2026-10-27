'use client';

import { IconExclamationmarkCircleFill } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';

import { useConnectKakaoNotification } from '@/features/connect-kakao-notification/model/use-connect-kakao-notification';

import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';
import { useUpdateNotificationMethod } from '@/entities/notification/api/update-notification-method';

export function KakaoRevokedBanner() {
	const { data } = useQuery(notificationSettingsQueryOptions());
	const connect = useConnectKakaoNotification();
	const updateMethod = useUpdateNotificationMethod();

	if (data?.notificationMethod !== 'kakao' || data.kakaoStatus !== 'revoked') {
		return null;
	}

	return (
		<section
			aria-label="카카오 알림 연동 끊김"
			className="flex flex-col gap-3 rounded-[20px] bg-[var(--seed-color-bg-layer-default)] p-4 md:flex-row
				md:items-center md:justify-between md:p-5"
		>
			<div className="flex min-w-0 items-center gap-3">
				<div className="relative h-10 w-10 shrink-0">
					<span
						aria-hidden
						className="absolute inset-0 rounded-[14px] bg-[var(--seed-color-bg-critical-weak)] motion-safe:animate-ping"
					/>
					<div
						className="relative flex h-full w-full items-center justify-center rounded-[14px]
							bg-[var(--seed-color-bg-critical-weak)] text-[var(--seed-color-fg-critical)]"
					>
						<IconExclamationmarkCircleFill size={22} />
					</div>
				</div>
				<div className="min-w-0">
					<p className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">카카오 알림 연동이 끊어졌어요</p>
					<p className="mt-0.5 text-sm break-keep text-[var(--seed-color-fg-neutral-subtle)]">
						리마인드를 카카오톡으로 받으려면 다시 연동해주세요
					</p>
				</div>
			</div>
			<div className="flex shrink-0 justify-end gap-2">
				<ActionButton
					size="small"
					variant="neutralWeak"
					loading={updateMethod.isPending}
					onClick={() => updateMethod.mutate('manual')}
				>
					알림 끄기
				</ActionButton>
				<ActionButton size="small" variant="neutralSolid" loading={connect.isPending} onClick={() => connect.mutate()}>
					다시 연동하기
				</ActionButton>
			</div>
		</section>
	);
}
