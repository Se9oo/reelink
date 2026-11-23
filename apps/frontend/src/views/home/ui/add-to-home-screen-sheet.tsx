'use client';

import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';

interface AddToHomeScreenSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const STEPS = ['사파리 아래쪽 공유 버튼을 눌러요', '홈 화면에 추가를 골라요', '홈 화면의 Reelink로 열고 알림을 켜요'];

export function AddToHomeScreenSheet({ open, onOpenChange }: AddToHomeScreenSheetProps) {
	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title="홈 화면에 추가하고 알림 받기">
				<BottomSheetBody>
					<ol className="flex flex-col gap-3">
						{STEPS.map((step, index) => (
							<li key={step} className="flex items-center gap-2.5 text-sm text-[var(--seed-color-fg-neutral)]">
								<span
									className="flex size-[22px] shrink-0 items-center justify-center rounded-full
										bg-[var(--seed-color-bg-brand-solid)] text-xs font-bold text-white"
								>
									{index + 1}
								</span>
								{step}
							</li>
						))}
					</ol>
				</BottomSheetBody>
				<BottomSheetFooter>
					<ActionButton variant="brandSolid" flexGrow={1} onClick={() => onOpenChange(false)}>
						확인
					</ActionButton>
				</BottomSheetFooter>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}
