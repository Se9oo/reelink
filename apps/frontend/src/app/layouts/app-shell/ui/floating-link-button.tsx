'use client';

import { usePathname } from 'next/navigation';

import { openRegisterLinkModal } from '@/features/register-link/ui/open-register-link-modal';

import { ROUTES } from '@/shared/config/routes';
import { IconLinkLine } from '@/shared/ui/icons/icon-link-line';

export function FloatingLinkButton() {
	const pathname = usePathname();

	if (pathname === ROUTES.FEED) {
		return null;
	}

	return (
		<div className="absolute right-5 bottom-5 z-[1] hidden lg:block">
			<button
				type="button"
				aria-label="링크 등록"
				onClick={openRegisterLinkModal}
				className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full
					bg-[var(--seed-color-bg-brand-solid)] text-[var(--seed-color-palette-static-white)]
					shadow-[0_4px_12px_rgb(0_127_255/0.3)] transition-[background-color,transform] duration-200
					hover:bg-[var(--seed-color-bg-brand-solid-pressed)] active:scale-95"
			>
				<IconLinkLine size={28} />
			</button>
		</div>
	);
}
