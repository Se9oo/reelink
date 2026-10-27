import { KakaoNotificationConnect } from '@/features/connect-kakao-notification/ui/kakao-notification-connect';
import { ThemeToggle } from '@/features/toggle-theme/ui/theme-toggle';

export default function SettingsPage() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<h1 className="text-lg font-semibold text-[var(--seed-color-fg-neutral)]">설정</h1>

			<section className="flex items-center justify-between">
				<span className="text-sm text-[var(--seed-color-fg-neutral)]">다크 모드</span>
				<ThemeToggle />
			</section>

			<section className="flex items-center justify-between">
				<span className="text-sm text-[var(--seed-color-fg-neutral)]">카카오톡 알림</span>
				<KakaoNotificationConnect />
			</section>

			<section className="flex items-center justify-between">
				<span className="text-sm text-[var(--seed-color-fg-neutral)]">카카오톡 봇 연동</span>
				<span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">준비 중</span>
			</section>
		</div>
	);
}
