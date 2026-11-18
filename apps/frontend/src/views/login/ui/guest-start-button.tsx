'use client';

import { useStartGuest } from '@/entities/user/api/start-guest';

export function GuestStartButton() {
	const startGuest = useStartGuest();
	const starting = startGuest.isPending || startGuest.isSuccess;

	return (
		<div className="flex flex-col items-center gap-1">
			<button
				type="button"
				disabled={starting}
				onClick={() => startGuest.mutate()}
				className="text-sm font-semibold text-[var(--seed-color-fg-neutral)]
					disabled:text-[var(--seed-color-fg-neutral-subtle)]"
			>
				{starting ? (
					'시작하는 중…'
				) : (
					<>
						로그인 없이 시작하기 <span aria-hidden>→</span>
					</>
				)}
			</button>
			<p className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
				나중에 로그인하면 저장한 링크가 그대로 이어져요
			</p>
		</div>
	);
}
