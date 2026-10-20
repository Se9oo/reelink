'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';

import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { useRenameFolder } from '@/entities/folder/api/rename-folder';

interface RenameFolderModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	currentName: string;
}

export function RenameFolderModal({ open, onOpenChange, folderId, currentName }: RenameFolderModalProps) {
	const [name, setName] = useState(currentName);
	const { mutate: renameFolder, isPending, error } = useRenameFolder();

	const trimmed = name.trim();
	const canSave = trimmed !== '' && trimmed !== currentName && !isPending;

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		if (!canSave) {
			return;
		}

		renameFolder({ folderId, name: trimmed }, { onSuccess: () => onOpenChange(false) });
	};

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent title="폴더 이름 변경">
				<form onSubmit={handleSubmit}>
					<DialogBody>
						<TextField
							label="폴더 이름"
							required
							value={name}
							onValueChange={({ slicedValue }) => setName(slicedValue)}
							maxGraphemeCount={50}
						>
							<TextFieldInput autoFocus />
						</TextField>
						{error && (
							<p className="text-sm text-[var(--seed-color-fg-critical)]">이름을 바꾸지 못했어요. 다시 시도해주세요.</p>
						)}
					</DialogBody>
					<DialogFooter className="gap-2" style={{ flexDirection: 'row' }}>
						<ActionButton type="button" variant="neutralWeak" flexGrow={1} onClick={() => onOpenChange(false)}>
							취소
						</ActionButton>
						<ActionButton type="submit" variant="brandSolid" flexGrow={1} disabled={!canSave}>
							저장
						</ActionButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
