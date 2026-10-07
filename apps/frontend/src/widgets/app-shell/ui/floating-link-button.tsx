'use client';

import { useState } from 'react';

import { IconPlusFill } from '@karrotmarket/react-monochrome-icon';
import { DialogRoot, DialogTrigger } from 'seed-design/ui/dialog';
import { FloatingActionButton } from 'seed-design/ui/floating-action-button';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

export function FloatingLinkButton() {
	const [open, setOpen] = useState(false);

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<div className="fixed right-5 bottom-[84px] z-40 lg:bottom-5">
				<DialogTrigger asChild>
					<FloatingActionButton icon={<IconPlusFill />} label="링크 등록" />
				</DialogTrigger>
			</div>
			<RegisterLinkModal onRegistered={() => setOpen(false)} />
		</DialogRoot>
	);
}
