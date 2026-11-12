'use client';

import { Suspense } from 'react';
import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import {
	IconBellLine,
	IconBellSlashLine,
	IconBookmarkFill,
	IconCheckmarkCircleLine,
	IconDot3HorizontalFill,
	IconLightbulbDot5Fill,
} from '@karrotmarket/react-monochrome-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { greetingFor, subGreetingFor } from '@/widgets/home/model/home-copy';
import { HomeLinkCard } from '@/widgets/home/ui/home-link-card';
import { RemindPreviewStack } from '@/widgets/home/ui/remind-preview-stack';
import { StaleLinkCard } from '@/widgets/home/ui/stale-link-card';

import { KakaoRevokedBanner } from '@/features/connect-kakao-notification/ui/kakao-revoked-banner';
import { KakaoOnboardingCard } from '@/features/kakao-onboarding/ui/kakao-onboarding-card';
import { useLinkActions } from '@/features/link-actions/model/use-link-actions';
import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { homeKeys, homeQueryOptions } from '@/entities/link/api/get-home';
import { useViewLink } from '@/entities/link/api/view-link';
import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';
import { formatRemindAt } from '@/shared/lib/format-remind-at';

export function HomeScreen() {
	const { data: home } = useQuery(homeQueryOptions());
	const { data: me } = useQuery(meQueryOptions());
	const queryClient = useQueryClient();
	const router = useRouter();
	const viewLink = useViewLink();
	const { onDelete, onRemind, onClearRemind } = useLinkActions();

	if (!home || !me) {
		return null;
	}

	const { remind, upcoming, stale, recent } = home;
	const isEmpty = recent.length === 0 && remind.unviewedCount === 0 && remind.revisitCount === 0;

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
				className="mx-auto flex w-full max-w-[920px] min-w-0 flex-col gap-7 px-4 pt-5 pb-16 md:px-8 md:pt-8 md:pb-8
					lg:px-10 lg:pb-16 xl:max-w-[1160px]"
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
				<Suspense>
					<KakaoOnboardingCard />
				</Suspense>

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

						<Section
							label="오래 쌓인 링크"
							description={stale.length > 0 ? '아직 볼 건지, 이제 보내줄 건지 골라주세요' : undefined}
						>
							{stale.length > 0 ? (
								<ul className="grid gap-2.5 md:grid-cols-3">
									{stale.map((link) => (
										<StaleLinkCard
											key={link.id}
											link={link}
											onView={() => viewLink.mutate(link.id)}
											onDelete={() => onDelete(link)}
										/>
									))}
								</ul>
							) : (
								<SectionPlaceholder
									icon={<IconCheckmarkCircleLine size={26} />}
									title="오래 쌓인 링크가 없어요"
									description="2주 넘게 안 본 링크가 생기면 여기서 정리할 수 있어요"
								/>
							)}
						</Section>

						<Section label="알림 예약한 링크">
							{upcoming.length > 0 ? (
								<CardScroller>
									{upcoming.map((link) => (
										<HomeLinkCard
											key={link.id}
											link={link}
											className={CARD_CLASS}
											caption={
												link.remindAt && (
													<div className="flex flex-col gap-1.5">
														<p className="truncate text-xs text-[var(--seed-color-fg-neutral-muted)]">
															{new URL(link.url).hostname}
														</p>
														<p
															className="flex max-w-full items-center gap-1 self-start rounded-full
																bg-[var(--seed-color-bg-brand-weak)] px-2 py-0.5 text-xs font-bold
																text-[var(--seed-color-fg-brand)]"
														>
															<IconBellLine size={12} className="shrink-0" />
															<span className="truncate">{formatRemindAt(link.remindAt)}</span>
														</p>
													</div>
												)
											}
											actions={
												<MenuRoot size="small">
													<MenuTrigger asChild>
														<button
															type="button"
															aria-label="더보기"
															className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg
																text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
														>
															<IconDot3HorizontalFill size={18} />
														</button>
													</MenuTrigger>
													<MenuContent>
														<MenuGroup>
															<MenuItem
																label="알림 시각 변경"
																prefixIcon={<IconBellLine />}
																onClick={() => onRemind(link)}
															/>
															<MenuItem
																label="알림 해제"
																prefixIcon={<IconBellSlashLine />}
																onClick={() => onClearRemind(link)}
															/>
														</MenuGroup>
													</MenuContent>
												</MenuRoot>
											}
										/>
									))}
								</CardScroller>
							) : (
								<SectionPlaceholder
									icon={<IconBellLine size={26} />}
									title="예약한 알림이 없어요"
									description="링크 더보기에서 알림 시각을 정하면 여기에 보여요"
								/>
							)}
						</Section>

						{recent.length > 0 && (
							<Section label="최근 저장한 링크">
								<CardScroller>
									{recent.map((link) => (
										<HomeLinkCard key={link.id} link={link} className={CARD_CLASS} />
									))}
								</CardScroller>
							</Section>
						)}
					</>
				)}
			</div>
		</div>
	);
}

const CARD_CLASS = 'w-[272px] shrink-0 snap-start';

function CardScroller({ children }: { children: ReactNode }) {
	return (
		<div
			className="-mx-4 flex snap-x [scrollbar-color:transparent_transparent] gap-2.5 overflow-x-auto px-4 pb-1
				hover:[scrollbar-color:var(--app-scrollbar-hover)_transparent] md:mx-0 md:px-0"
		>
			{children}
		</div>
	);
}

function Em({ children }: { children: ReactNode }) {
	return <em className="text-[var(--seed-color-fg-brand)] not-italic">{children}</em>;
}

function Section({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
	return (
		<section aria-label={label} className="flex min-w-0 flex-col gap-2.5">
			<div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-2.5">
				<h2 className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">{label}</h2>
				{description && <p className="text-[13px] text-[var(--seed-color-fg-neutral-muted)]">{description}</p>}
			</div>
			{children}
		</section>
	);
}

function SectionPlaceholder({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
	return (
		<div
			className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] px-6 py-8 text-center"
		>
			<div
				className="mb-1 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--seed-color-bg-brand-weak)]
					text-[var(--seed-color-fg-brand)]"
			>
				{icon}
			</div>
			<p className="text-[15px] font-bold text-[var(--seed-color-fg-neutral)]">{title}</p>
			<p className="text-[13px] text-balance break-keep text-[var(--seed-color-fg-neutral-muted)]">{description}</p>
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
