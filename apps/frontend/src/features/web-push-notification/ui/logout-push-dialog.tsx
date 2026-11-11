'use client';

import { useState } from 'react';

import { ResponsivePair } from '@seed-design/react';
import {
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogRoot,
	AlertDialogTitle,
} from 'seed-design/ui/alert-dialog';

import { turnOffWebPush } from '@/features/web-push-notification/lib/browser-push';

import { useLogout } from '@/entities/user/api/logout';

interface LogoutPushDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	subscription: PushSubscription;
}

export function LogoutPushDialog({ open, onOpenChange, subscription }: LogoutPushDialogProps) {
	const logout = useLogout();
	const [turningOff, setTurningOff] = useState(false);
	const [failed, setFailed] = useState(false);
	const busy = turningOff || logout.isPending;

	function logoutAndClose() {
		logout.mutate(undefined, { onSuccess: () => onOpenChange(false) });
	}

	async function turnOffAndLogout() {
		setTurningOff(true);
		setFailed(false);

		try {
			await turnOffWebPush(subscription);
			logoutAndClose();
		} catch {
			setFailed(true);
		} finally {
			setTurningOff(false);
		}
	}

	return (
		<AlertDialogRoot open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>이 기기로 알림이 계속 와요</AlertDialogTitle>
					<AlertDialogDescription>
						다른 사람과 함께 쓰는 기기라면 알림도 꺼주세요.
						{failed && (
							<span className="mt-1 block text-[var(--seed-color-fg-critical)]">
								알림을 끄지 못했어요. 다시 시도해주세요.
							</span>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<ResponsivePair gap="x2">
						<AlertDialogAction
							variant="neutralWeak"
							onClick={(event) => {
								event.preventDefault();

								if (!busy) {
									logoutAndClose();
								}
							}}
						>
							로그아웃만
						</AlertDialogAction>
						<AlertDialogAction
							variant="neutralSolid"
							onClick={(event) => {
								event.preventDefault();

								if (!busy) {
									turnOffAndLogout();
								}
							}}
						>
							알림 끄고 로그아웃
						</AlertDialogAction>
					</ResponsivePair>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialogRoot>
	);
}
