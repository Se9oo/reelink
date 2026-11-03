'use client';

import Link from 'next/link';

import { IconExclamationmarkCircleFill } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { Callout } from 'seed-design/ui/callout';

import { meQueryOptions } from '@/entities/user/api/get-me';

import { ROUTES } from '@/shared/config/routes';

export function GuestDataNotice() {
	const { data: me } = useQuery(meQueryOptions());

	if (!me?.isGuest) {
		return null;
	}

	return (
		<Callout
			role="note"
			tone="warning"
			prefixIcon={<IconExclamationmarkCircleFill />}
			title="Guest로 저장한 링크는 이 브라우저에만 연결돼 있어요"
			description="쿠키를 지우거나 30일 동안 접속하지 않으면 사라져요."
			linkProps={{ asChild: true, children: <Link href={ROUTES.LOGIN}>로그인하고 계정에 보관하기</Link> }}
		/>
	);
}
