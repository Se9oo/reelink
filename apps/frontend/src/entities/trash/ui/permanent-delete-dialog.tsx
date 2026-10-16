'use client';

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

import { useDeleteTrashItem } from '@/entities/trash/api/delete-trash-item';

interface PermanentDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: 'folder' | 'link';
	id: string;
	name: string;
}

export function PermanentDeleteDialog({ open, onOpenChange, type, id, name }: PermanentDeleteDialogProps) {
	const { mutate: deleteTrashItem, isPending, error } = useDeleteTrashItem();

	return (
		<AlertDialogRoot open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{type === 'folder' ? `"${name}" 폴더를 영구 삭제할까요?` : `"${name}" 링크를 영구 삭제할까요?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{type === 'folder' && (
							<>
								하위 폴더와 링크까지 모두 삭제돼요.
								<br />
							</>
						)}
						영구 삭제하면 다시 복구할 수 없어요.
						{error && (
							<span className="mt-1 block text-[var(--seed-color-fg-critical)]">
								삭제하지 못했어요. 다시 시도해주세요.
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

								deleteTrashItem({ type, id }, { onSuccess: () => onOpenChange(false) });
							}}
						>
							영구 삭제
						</AlertDialogAction>
					</ResponsivePair>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialogRoot>
	);
}
