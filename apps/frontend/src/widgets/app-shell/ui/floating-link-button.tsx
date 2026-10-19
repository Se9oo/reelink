'use client';

import { IconPlusFill } from '@karrotmarket/react-monochrome-icon';
import { overlay } from 'overlay-kit';
import { FloatingActionButton } from 'seed-design/ui/floating-action-button';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

export function FloatingLinkButton() {
	function openRegisterLinkModal() {
		overlay.open(({ isOpen, close }) => (
			<RegisterLinkModal open={isOpen} onOpenChange={(open) => !open && close()} onRegistered={() => close()} />
		));
	}

	return (
		<div className="fixed right-5 bottom-[84px] z-[1] lg:bottom-5">
			<FloatingActionButton icon={<IconPlusFill />} label="링크 등록" onClick={openRegisterLinkModal} />
		</div>
	);
}
