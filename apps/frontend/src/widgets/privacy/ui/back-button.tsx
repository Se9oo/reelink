'use client';

import { useRouter } from 'next/navigation';

import { IconChevronLeftLine } from '@karrotmarket/react-monochrome-icon';

import { ROUTES } from '@/shared/config/routes';

export function BackButton() {
	const router = useRouter();

	const handleClick = () => {
		if (window.history.length > 1) {
			router.back();
		} else {
			router.push(ROUTES.LOGIN);
		}
	};

	return (
		<button
			type="button"
			aria-label="뒤로 가기"
			onClick={handleClick}
			className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--seed-color-fg-neutral)]"
		>
			<IconChevronLeftLine size={22} />
		</button>
	);
}
