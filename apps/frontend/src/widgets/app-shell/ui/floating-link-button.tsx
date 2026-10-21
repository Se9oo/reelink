'use client';

import { usePathname } from 'next/navigation';

import { overlay } from 'overlay-kit';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { ROUTES } from '@/shared/config/routes';
import { IconLinkLine } from '@/shared/ui/icons/icon-link-line';

export function FloatingLinkButton() {
	const pathname = usePathname();

	function openRegisterLinkModal() {
		overlay.open(({ isOpen, close }) => (
			<RegisterLinkModal open={isOpen} onOpenChange={(open) => !open && close()} onRegistered={() => close()} />
		));
	}

	if (pathname === ROUTES.FEED) {
		return null;
	}

	return (
		<div className="fixed right-5 bottom-[84px] z-[1] lg:bottom-5">
			<button
				type="button"
				aria-label="링크 등록"
				onClick={openRegisterLinkModal}
				className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full
					bg-[var(--seed-color-bg-brand-solid)] text-[var(--seed-color-palette-static-white)]
					shadow-[0_4px_12px_rgb(0_127_255/0.3)] transition-transform
					hover:bg-[var(--seed-color-bg-brand-solid-pressed)] active:scale-95 md:h-14 md:w-14"
			>
				<IconLinkLine size={22} className="md:h-7 md:w-7" />
			</button>
		</div>
	);
}
