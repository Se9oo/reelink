import { overlay } from 'overlay-kit';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

export function openRegisterLinkModal() {
	overlay.open(({ isOpen, close }) => (
		<RegisterLinkModal open={isOpen} onOpenChange={(open) => !open && close()} onRegistered={() => close()} />
	));
}
