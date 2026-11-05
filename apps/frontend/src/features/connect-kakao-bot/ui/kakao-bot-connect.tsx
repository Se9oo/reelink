'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { KakaoBotLinkDialog } from '@/features/connect-kakao-bot/ui/kakao-bot-link-dialog';

import { linkStatusQueryOptions } from '@/entities/kakao-bot/api/get-link-status';
import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';

export function KakaoBotConnect() {
	const { data: me } = useQuery(meQueryOptions());
	const { data: status } = useQuery({ ...linkStatusQueryOptions(), enabled: me?.isGuest === false });

	function openLinkDialog() {
		overlay.open(({ isOpen, close }) => <KakaoBotLinkDialog open={isOpen} onOpenChange={(open) => !open && close()} />);
	}

	if (me?.isGuest) {
		return (
			<ActionButton asChild size="small" variant="neutralWeak">
				<Link href={ROUTES.LOGIN}>로그인</Link>
			</ActionButton>
		);
	}

	if (!status) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			{status.linked && <span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">연동됨</span>}
			<ActionButton size="small" variant="neutralWeak" onClick={openLinkDialog}>
				{status.linked ? '다시 연동하기' : '연동하기'}
			</ActionButton>
		</div>
	);
}
