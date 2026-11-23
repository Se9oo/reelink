'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { overlay } from 'overlay-kit';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { ROUTES } from '@/shared/config/routes';

export function ShareScreen({ sharedUrl }: { sharedUrl: string | null }) {
	const router = useRouter();

	useEffect(() => {
		router.replace(ROUTES.HOME);
		overlay.open(({ isOpen, close }) => (
			<RegisterLinkModal
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				onRegistered={() => close()}
				initialUrl={sharedUrl ?? undefined}
			/>
		));
	}, [router, sharedUrl]);

	return null;
}
