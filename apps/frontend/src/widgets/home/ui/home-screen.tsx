'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import { IconBookmarkFill, IconLightbulbDot5Fill, IconSparkle2Fill } from '@karrotmarket/react-monochrome-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { greetingFor, praiseFor, subGreetingFor } from '@/widgets/home/model/home-copy';
import { HomeLinkCard } from '@/widgets/home/ui/home-link-card';
import { RemindPreviewStack } from '@/widgets/home/ui/remind-preview-stack';

import { KakaoRevokedBanner } from '@/features/connect-kakao-notification/ui/kakao-revoked-banner';
import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { homeKeys, homeQueryOptions } from '@/entities/link/api/get-home';
import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';

const THROWBACK_LABELS = { oneMonth: '한 달 전 오늘', threeMonths: '3개월 전 이맘때' } as const;

export function HomeScreen() {
	const { data: home } = useQuery(homeQueryOptions());
	const { data: me } = useQuery(meQueryOptions());
	const queryClient = useQueryClient();
	const router = useRouter();

	if (!home || !me) {
		return null;
	}

	const { remind, week, recent, throwbacks } = home;
	const isEmpty = recent.length === 0 && remind.unviewedCount === 0 && remind.revisitCount === 0;
	const praise = praiseFor(week);

	function openRegisterModal() {
		overlay.open(({ isOpen, close }) => (
			<RegisterLinkModal
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				onRegistered={() => {
					close();
					queryClient.invalidateQueries({ queryKey: homeKeys.all });
				}}
			/>
		));
	}

	return (
		<div className="min-h-full overflow-x-hidden bg-[var(--app-bg-canvas)]">
			<div
				className="mx-auto flex w-full max-w-[920px] min-w-0 flex-col gap-7 px-4 pt-5 pb-24 md:px-8 md:pt-8 lg:px-10
					lg:pb-16 xl:max-w-[1160px]"
			>
				<header>
					<h1 className="text-xl font-extrabold text-balance break-keep text-[var(--seed-color-fg-neutral)] md:text-2xl">
						{me.nickname}님, {greetingFor(new Date().getHours())}
					</h1>
					<p className="mt-1.5 text-sm text-[var(--seed-color-fg-neutral-muted)]">
						{subGreetingFor(remind.unviewedCount)}
					</p>
				</header>

				<KakaoRevokedBanner />

				{isEmpty ? (
					<EmptyHome onRegister={openRegisterModal} />
				) : (
					<>
						<section
							aria-label="오늘의 리마인드"
							className="flex items-center justify-between gap-5 rounded-[20px] border
								border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] p-5 md:p-6"
						>
							<div className="min-w-0 flex-1">
								<span
									className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--seed-color-fg-brand)]"
								>
									<IconLightbulbDot5Fill size={16} />
									오늘의 리마인드
								</span>
								<h2
									className="mt-2 text-xl leading-snug font-extrabold text-balance break-keep
										text-[var(--seed-color-fg-neutral)]"
								>
									안 본 링크 <Em>{remind.unviewedCount}개</Em>, 오늘 다시 볼 링크 <Em>{remind.revisitCount}개</Em>가
									기다려요
								</h2>
								{remind.oldestUnviewed && (
									<p className="mt-1.5 flex text-sm text-[var(--seed-color-fg-neutral-subtle)]">
										<span className="shrink-0">가장 오래된 건&nbsp;&quot;</span>
										<span className="truncate">
											{remind.oldestUnviewed.title ?? new URL(remind.oldestUnviewed.url).hostname}
										</span>
										<span className="shrink-0">&quot;예요.</span>
									</p>
								)}
								<div className="mt-4 flex justify-end md:justify-start">
									<ActionButton variant="brandSolid" size="medium" onClick={() => router.push(ROUTES.FEED)}>
										리마인드 시작
									</ActionButton>
								</div>
							</div>
							<RemindPreviewStack links={remind.previews} />
						</section>

						<Section label="이번 주 기록">
							<div className="grid grid-cols-3 gap-2.5">
								<Stat label="저장" value={week.saved} />
								<Stat label="봤어요" value={week.viewed} />
								<Stat label="정리했어요" value={week.cleaned} />
							</div>
							{praise && (
								<p className="flex items-center gap-2 text-[13px] text-[var(--seed-color-fg-neutral-subtle)]">
									<IconSparkle2Fill size={16} className="shrink-0 text-[var(--seed-color-fg-brand)]" />
									{praise}
								</p>
							)}
						</Section>

						{recent.length > 0 && (
							<Section label="최근 저장한 링크">
								<div
									className="-mx-4 flex snap-x [scrollbar-color:transparent_transparent] gap-2.5 overflow-x-auto px-4
										pb-1 hover:[scrollbar-color:var(--app-scrollbar-hover)_transparent] md:mx-0 md:px-0"
								>
									{recent.map((link) => (
										<HomeLinkCard key={link.id} link={link} className="w-[176px] shrink-0 snap-start md:w-[200px]" />
									))}
								</div>
							</Section>
						)}

						{throwbacks.length > 0 && (
							<Section label="그때 저장한 링크">
								<div className="grid gap-2.5 md:grid-cols-2">
									{throwbacks.map(({ label, link }) => (
										<div key={label} className="flex flex-col gap-1.5">
											<span className="text-[12px] font-bold text-[var(--seed-color-fg-brand)]">
												{THROWBACK_LABELS[label]}
											</span>
											<HomeLinkCard link={link} />
										</div>
									))}
								</div>
							</Section>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function Em({ children }: { children: ReactNode }) {
	return <em className="text-[var(--seed-color-fg-brand)] not-italic">{children}</em>;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
	return (
		<section aria-label={label} className="flex min-w-0 flex-col gap-2.5">
			<h2 className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">{label}</h2>
			{children}
		</section>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div
			className="rounded-2xl border border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] px-3 py-3 md:px-4 md:py-3.5"
		>
			<p className="truncate text-xs text-[var(--seed-color-fg-neutral-muted)] md:text-[12.5px]">{label}</p>
			<p className="mt-1 text-xl font-extrabold text-[var(--seed-color-fg-neutral)] tabular-nums md:text-2xl">
				{value}
				<span className="ml-0.5 text-[13px] font-semibold text-[var(--seed-color-fg-neutral-muted)]">개</span>
			</p>
		</div>
	);
}

function EmptyHome({ onRegister }: { onRegister: () => void }) {
	return (
		<section
			aria-label="첫 링크 저장"
			className="flex flex-col items-center gap-2.5 rounded-[20px] border
				border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] px-6 py-14 text-center"
		>
			<div
				className="mb-1 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[var(--seed-color-bg-brand-weak)]
					text-[var(--seed-color-fg-brand)]"
			>
				<IconBookmarkFill size={36} />
			</div>
			<p className="text-[17px] font-bold text-[var(--seed-color-fg-neutral)]">첫 링크를 저장해보세요</p>
			<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">
				나중에 볼 링크를 저장하면, 잊기 전에 여기서 다시 보여드릴게요
			</p>
			<div className="mt-3">
				<ActionButton variant="brandSolid" size="medium" onClick={onRegister}>
					링크 등록하기
				</ActionButton>
			</div>
		</section>
	);
}
