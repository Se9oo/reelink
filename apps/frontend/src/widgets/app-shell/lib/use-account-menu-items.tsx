'use client';

import { useRouter } from 'next/navigation';

import { IconBracketLeftArrowRightLine, IconGearLine, IconTrashcanLine } from '@karrotmarket/react-monochrome-icon';

import { useLogout } from '@/entities/user/api/logout';

import { ROUTES } from '@/shared/config/routes';

export function useAccountMenuItems(isGuest: boolean) {
	const router = useRouter();
	const logout = useLogout();

	return [
		{ label: '휴지통', icon: <IconTrashcanLine />, onClick: () => router.push(ROUTES.TRASH) },
		{ label: '설정', icon: <IconGearLine />, onClick: () => router.push(ROUTES.SETTINGS) },
		isGuest
			? { label: '로그인', icon: <IconBracketLeftArrowRightLine />, onClick: () => router.push(ROUTES.LOGIN) }
			: {
					label: '로그아웃',
					icon: <IconBracketLeftArrowRightLine />,
					onClick: () => {
						if (!logout.isPending) {
							logout.mutate();
						}
					},
				},
	];
}
