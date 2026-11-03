'use client';

import { IconHandWaveFill } from '@karrotmarket/react-monochrome-icon';
import { PrefixIcon } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';

import { useStartGuest } from '@/entities/user/api/start-guest';

export function GuestStartButton() {
	const startGuest = useStartGuest();

	return (
		<ActionButton
			variant="neutralWeak"
			size="medium"
			loading={startGuest.isPending}
			onClick={() => startGuest.mutate()}
		>
			<PrefixIcon svg={<IconHandWaveFill />} />
			Guest로 시작하기
		</ActionButton>
	);
}
