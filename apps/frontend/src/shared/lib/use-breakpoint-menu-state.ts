'use client';

import { useState } from 'react';

import { useMediaQuery } from '@/shared/lib/use-media-query';

export function useBreakpointMenuState() {
	const isDesktop = useMediaQuery('(min-width: 1024px)');

	const [open, setOpen] = useState(false);
	const [instant, setInstant] = useState(false);
	const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop);

	if (isDesktop !== prevIsDesktop) {
		setPrevIsDesktop(isDesktop);
		setOpen(false);
		setInstant(true);
	}

	function onOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);

		if (nextOpen) {
			setInstant(false);
		}
	}

	return { open, onOpenChange, instant };
}
