import type { ReactNode } from 'react';

import { KakaoNotificationConnect } from '@/features/connect-kakao-notification/ui/kakao-notification-connect';
import { ThemeSwitch } from '@/features/toggle-theme/ui/theme-switch';

export default function SettingsPage() {
	return (
		<div className="min-h-full bg-[var(--app-bg-canvas)]">
			<div className="mx-auto flex w-full max-w-[640px] flex-col gap-7 px-4 pt-5 pb-24 md:px-8 md:pt-8 lg:pb-16">
				<h1 className="text-xl font-bold text-[var(--seed-color-fg-neutral)]">설정</h1>

				<SettingsGroup label="화면">
					<SettingsRow label="다크 모드">
						<ThemeSwitch />
					</SettingsRow>
				</SettingsGroup>

				<SettingsGroup label="알림">
					<SettingsRow label="카카오톡 알림" description="안 본 링크가 쌓이면 3일에 한 번 카카오톡으로 알려드려요">
						<KakaoNotificationConnect />
					</SettingsRow>
				</SettingsGroup>

				<SettingsGroup label="링크 등록">
					<SettingsRow label="카카오톡 봇 연동" description="봇 채팅방에 링크를 보내면 바로 저장돼요">
						<span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">준비 중</span>
					</SettingsRow>
				</SettingsGroup>
			</div>
		</div>
	);
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
	return (
		<section aria-label={label} className="flex flex-col gap-2.5">
			<h2 className="px-1 text-[13px] font-bold text-[var(--seed-color-fg-neutral-muted)]">{label}</h2>
			<div
				className="divide-y divide-[var(--seed-color-stroke-neutral-subtle)] rounded-[20px] border
					border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)]"
			>
				{children}
			</div>
		</section>
	);
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
	return (
		<div className="flex min-h-16 items-center justify-between gap-4 px-5 py-3.5">
			<div className="min-w-0">
				<p className="text-[15px] font-semibold text-[var(--seed-color-fg-neutral)]">{label}</p>
				{description && (
					<p className="mt-0.5 text-[13px] break-keep text-[var(--seed-color-fg-neutral-muted)]">{description}</p>
				)}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}
