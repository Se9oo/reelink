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
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent title="카카오톡 봇 연동">
				<DialogBody>{open && <LinkCodePanel onClose={() => onOpenChange(false)} />}</DialogBody>
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
			<Notice title="연동 완료!" description="이제 봇 채팅방에 링크를 보내면 바로 저장돼요">
				<ActionButton variant="brandSolid" size="medium" onClick={onClose}>
					확인
				</ActionButton>
			</Notice>
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

	const remaining = Math.ceil((deadline - now) / 1000);
	const { code } = issue.data;

	return (
		<div className="flex flex-col items-center gap-5 pb-2">
			<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">아래 코드를 봇 채팅방에 보내주세요</p>
			<div className="flex flex-col items-center gap-1">
				<div className="flex items-center gap-3">
					<span className="font-mono text-3xl font-bold tracking-[0.3em] text-[var(--seed-color-fg-neutral)]">
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
				<span className="text-xs text-[var(--seed-color-fg-neutral-subtle)]">
					{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} 남음
				</span>
			</div>
			<ActionButton asChild variant="neutralSolid" size="medium" className="w-full">
				<a href={KAKAO_CHANNEL_CHAT_URL} target="_blank" rel="noreferrer">
					카카오톡에서 열기
				</a>
			</ActionButton>
			<div className="hidden flex-col items-center gap-2 lg:flex">
				<QRCodeSVG value={KAKAO_CHANNEL_CHAT_URL} size={120} />
				<p className="text-xs text-[var(--seed-color-fg-neutral-muted)]">휴대폰 카메라로 찍으면 봇 채팅방이 열려요</p>
			</div>
		</div>
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
