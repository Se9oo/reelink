'use client';

import { useState } from 'react';

import { ResponsivePair } from '@seed-design/react';
import { useQuery } from '@tanstack/react-query';
import {
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogRoot,
	AlertDialogTitle,
} from 'seed-design/ui/alert-dialog';

import { meQueryOptions } from '@/entities/user/api/get-me';
import { useWithdraw } from '@/entities/user/api/withdraw';

export function WithdrawButton() {
	const { data: me } = useQuery(meQueryOptions());
	const { mutate: withdraw, isPending, error } = useWithdraw();
	const [open, setOpen] = useState(false);

	if (!me || me.isGuest) {
		return null;
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="text-[13px] text-[var(--seed-color-fg-neutral-muted)] underline"
			>
				회원 탈퇴
			</button>
			<AlertDialogRoot open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>정말 탈퇴할까요?</AlertDialogTitle>
						<AlertDialogDescription>
							저장한 링크와 폴더, 알림 연동이 모두 삭제되고 되돌릴 수 없어요.
							{error && (
								<span className="mt-1 block text-[var(--seed-color-fg-critical)]">
									탈퇴하지 못했어요. 다시 시도해주세요.
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<ResponsivePair gap="x2">
							<AlertDialogAction variant="neutralWeak">취소</AlertDialogAction>
							<AlertDialogAction
								variant="criticalSolid"
								onClick={(event) => {
									event.preventDefault();

									if (isPending) {
										return;
									}

									withdraw();
								}}
							>
								탈퇴
							</AlertDialogAction>
						</ResponsivePair>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialogRoot>
		</>
	);
}
