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

import { useDeleteFolder } from '@/entities/folder/api/delete-folder';

interface DeleteFolderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string | null;
	folderName?: string;
}

export function DeleteFolderDialog({ open, onOpenChange, folderId, folderName }: DeleteFolderDialogProps) {
	const { mutate: deleteFolder, isPending, error } = useDeleteFolder();

	return (
		<AlertDialogRoot open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{folderName ? `"${folderName}" 폴더를 삭제할까요?` : '폴더를 삭제할까요?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						하위 폴더와 링크가 모두 휴지통으로 이동해요.
						<br />
						30일 이내에 휴지통에서 복구할 수 있어요.
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
								if (!folderId || isPending) {
									return;
								}

								event.preventDefault();
								deleteFolder(folderId, { onSuccess: () => onOpenChange(false) });
							}}
						>
							삭제
						</AlertDialogAction>
					</ResponsivePair>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialogRoot>
	);
}
