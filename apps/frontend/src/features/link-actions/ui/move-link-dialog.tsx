'use client';

import { useState } from 'react';

import { ResponsivePair } from '@seed-design/react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';

import { FolderTreeSelect } from '@/features/register-link/ui/folder-tree-select';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';

import { useMediaQuery } from '@/shared/lib/use-media-query';

interface MoveLinkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentFolderId: string;
	onConfirm: (folderId: string) => void;
}

export function MoveLinkDialog({ open, onOpenChange, currentFolderId, onConfirm }: MoveLinkDialogProps) {
	const isTabletUp = useMediaQuery('(min-width: 768px)');
	const [folderId, setFolderId] = useState<string | null>(null);
	const { data: folders } = useQuery(foldersQueryOptions());
	const tree = folders ? buildFolderTree(folders) : [];

	const body = (
		<FolderTreeSelect nodes={tree} selectedId={folderId} onSelect={setFolderId} disabledId={currentFolderId} />
	);

	const footer = (
		<ResponsivePair gap="x2">
			<ActionButton variant="neutralWeak" onClick={() => onOpenChange(false)} flexGrow={1}>
				취소
			</ActionButton>
			<ActionButton
				variant="brandSolid"
				disabled={!folderId}
				onClick={() => {
					if (folderId) {
						onConfirm(folderId);
						onOpenChange(false);
					}
				}}
				flexGrow={1}
			>
				이동
			</ActionButton>
		</ResponsivePair>
	);

	if (isTabletUp) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent title="폴더 이동">
					<DialogBody>{body}</DialogBody>
					<DialogFooter>{footer}</DialogFooter>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title="폴더 이동">
				<BottomSheetBody>{body}</BottomSheetBody>
				<BottomSheetFooter>{footer}</BottomSheetFooter>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}
