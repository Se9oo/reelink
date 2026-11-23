'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogRoot } from 'seed-design/ui/dialog';

import { linkStatusQueryOptions } from '@/entities/kakao-bot/api/get-link-status';
import { useIssueLinkCode } from '@/entities/kakao-bot/api/issue-link-code';

import { KAKAO_CHANNEL_CHAT_URL } from '@/shared/config/env';

const CODE_TTL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;

interface KakaoBotLinkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function KakaoBotLinkDialog({ open, onOpenChange }: KakaoBotLinkDialogProps) {
	return (
		<DialogRoot open={open} onOpenChange={onOpenChange} lazyMount unmountOnExit>
			<DialogContent title="카카오톡 봇 연동">
				<DialogBody>
					<LinkCodePanel onClose={() => onOpenChange(false)} />
				</DialogBody>
			</DialogContent>
		</DialogRoot>
	);
}

function LinkCodePanel({ onClose }: { onClose: () => void }) {
	const issue = useIssueLinkCode();
	const { mutate: issueCode } = issue;
	const [now, setNow] = useState(() => Date.now());
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	useEffect(() => {
		issueCode();
	}, [issueCode]);

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const deadline = issue.data ? issue.submittedAt + CODE_TTL_MS : null;
	const expired = deadline !== null && now >= deadline;
	const issuedAt = issue.data ? Date.parse(issue.data.expiresAt) - CODE_TTL_MS : null;

	const { data: status } = useQuery({
		...linkStatusQueryOptions(),
		enabled: issuedAt !== null,
		refetchInterval: (query) => {
			const linkedAt = query.state.data?.linkedAt;
			const linked = issuedAt !== null && linkedAt != null && Date.parse(linkedAt) >= issuedAt;
			return linked || expired ? false : POLL_INTERVAL_MS;
		},
	});

	const done = issuedAt !== null && status?.linkedAt != null && Date.parse(status.linkedAt) >= issuedAt;

	if (issue.isError) {
		return (
			<Notice title="코드를 받지 못했어요" description="잠시 후 다시 시도해주세요">
				<ActionButton variant="neutralSolid" size="medium" onClick={() => issueCode()}>
					다시 시도
				</ActionButton>
			</Notice>
		);
	}

	if (!issue.data || deadline === null) {
		return <p className="py-8 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">코드를 받는 중이에요</p>;
	}

	if (done) {
		return (
			<div className="flex flex-col items-center gap-2 py-4 text-center">
				<p className="text-base font-bold text-[var(--seed-color-fg-neutral)]">연동 완료!</p>
				<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">이제 이렇게 저장할 수 있어요</p>
				<ol className="mt-1 flex w-full flex-col gap-3 rounded-2xl bg-[var(--seed-color-bg-neutral-weak)] p-3 text-left">
					<li>
						<ShareStepLabel number={1}>유튜브, 인스타에서 링크 복사</ShareStepLabel>
					</li>
					<li className="flex flex-col gap-2">
						<ShareStepLabel number={2}>Reelink 채팅방에 붙여넣어 보내기</ShareStepLabel>
						<div className="flex flex-col gap-2 rounded-xl bg-[#bacee0] p-3 text-[13px] text-[#191919]" aria-hidden>
							<span className="self-end rounded-xl rounded-tr-sm bg-[#fee500] px-3 py-1.5 break-all">
								https://youtu.be/…
							</span>
							<div className="flex flex-col items-start gap-1">
								<span className="text-xs text-[#4a5560]">Reelink</span>
								<span className="rounded-xl rounded-tl-sm bg-white px-3 py-1.5">저장했어요 ✅</span>
							</div>
						</div>
					</li>
				</ol>
				<div className="mt-3 w-full [&>*]:w-full">
					<ActionButton variant="brandSolid" size="medium" onClick={onClose}>
						확인
					</ActionButton>
				</div>
			</div>
		);
	}

	if (expired) {
		return (
			<Notice title="코드가 만료됐어요" description="코드는 발급 후 5분 동안만 쓸 수 있어요">
				<ActionButton variant="neutralSolid" size="medium" loading={issue.isPending} onClick={() => issueCode()}>
					새 코드 받기
				</ActionButton>
			</Notice>
		);
	}

	const remaining = Math.ceil(Math.min(deadline - now, CODE_TTL_MS) / 1000);
	const { code } = issue.data;

	return (
		<div className="flex flex-col items-center gap-5 pb-5">
			<p
				className="w-full rounded-xl bg-[var(--seed-color-bg-brand-weak)] px-3.5 py-3 text-[13px] break-keep
					text-[var(--seed-color-fg-neutral)]"
			>
				카카오톡 채팅방은 내 Reelink 계정을 알 수 없어서, 아래 코드를 한 번 보내 둘을 이어줘야 해요. <b>처음 한 번만</b>{' '}
				하면 돼요
			</p>
			<ol className="flex w-full flex-col gap-4">
				<Step number={1} title="연동 코드 복사">
					<div
						className="mt-2 flex items-center justify-between rounded-xl bg-[var(--seed-color-bg-neutral-weak)] px-4
							py-3"
					>
						<span className="font-mono text-2xl font-bold tracking-[0.3em] text-[var(--seed-color-fg-neutral)]">
							{code}
						</span>
						<ActionButton
							variant="neutralWeak"
							size="small"
							onClick={async () => {
								await navigator.clipboard.writeText(code);
								setCopiedCode(code);
							}}
						>
							{copiedCode === code ? '복사했어요' : '복사'}
						</ActionButton>
					</div>
					<p className="mt-1 text-xs text-[var(--seed-color-fg-neutral-subtle)]">
						{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} 남음
					</p>
				</Step>
				<Step
					number={2}
					title={
						<>
							카카오톡에서 <b>Reelink 채널</b> 채팅방 열기
						</>
					}
				/>
				<Step number={3} title="채팅방에 코드를 붙여넣어 보내기">
					<div className="mt-2 flex flex-col gap-2 rounded-xl bg-[#bacee0] p-3 text-[13px] text-[#191919]">
						<span className="self-end rounded-xl rounded-tr-sm bg-[#fee500] px-3 py-1.5 font-mono text-sm font-bold">
							{code}
						</span>
						<div className="flex flex-col items-start gap-1">
							<span className="text-xs text-[#4a5560]">Reelink</span>
							<span className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-1.5 break-keep">
								연동됐어요! 이제 링크를 보내면 저장해 드려요
							</span>
						</div>
					</div>
				</Step>
				<Step
					number={4}
					title={
						<>
							이 화면이 자동으로 <b>연동 완료</b>로 바뀌어요
						</>
					}
				/>
			</ol>
			<ActionButton asChild variant="brandSolid" size="medium" className="w-full">
				<a href={KAKAO_CHANNEL_CHAT_URL} target="_blank" rel="noreferrer">
					Reelink 채팅방 열기
				</a>
			</ActionButton>
			<div className="hidden flex-col items-center gap-2 lg:flex">
				<QRCodeSVG value={KAKAO_CHANNEL_CHAT_URL} size={120} />
				<p className="text-xs text-[var(--seed-color-fg-neutral-muted)]">휴대폰 카메라로 찍으면 봇 채팅방이 열려요</p>
			</div>
		</div>
	);
}

function Step({ number, title, children }: { number: number; title: React.ReactNode; children?: React.ReactNode }) {
	return (
		<li className="flex gap-2.5">
			<span
				className="flex size-[22px] shrink-0 items-center justify-center rounded-full
					bg-[var(--seed-color-bg-brand-solid)] text-xs font-bold text-white"
			>
				{number}
			</span>
			<div className="min-w-0 flex-1 text-sm text-[var(--seed-color-fg-neutral)]">
				<p className="leading-[22px] break-keep">{title}</p>
				{children}
			</div>
		</li>
	);
}

function ShareStepLabel({ number, children }: { number: number; children: React.ReactNode }) {
	return (
		<p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--seed-color-fg-neutral)]">
			<span
				className="flex size-4 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]
					text-[10px] font-bold text-white"
			>
				{number}
			</span>
			{children}
		</p>
	);
}

function Notice({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-2 py-4 text-center">
			<p className="text-base font-bold text-[var(--seed-color-fg-neutral)]">{title}</p>
			<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">{description}</p>
			<div className="mt-3 w-full [&>*]:w-full">{children}</div>
		</div>
	);
}
