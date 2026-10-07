'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { useCreateFolder } from '@/entities/folder/api/create-folder';
import { Folder } from '@/entities/folder/model/types';

interface CreateFolderModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	parentFolderId: string | null;
	parentFolderName?: string;
	onCreated?: (folder: Folder) => void;
}

export function CreateFolderModal({
	open,
	onOpenChange,
	parentFolderId,
	parentFolderName,
	onCreated,
}: CreateFolderModalProps) {
	const [name, setName] = useState('');
	const { mutate: createFolder, isPending, error, reset } = useCreateFolder();

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		if (!name.trim()) {
			return;
		}

		createFolder(
			{ name: name.trim(), parentFolderId },
			{
				onSuccess: (folder) => {
					setName('');
					onOpenChange(false);
					onCreated?.(folder);
				},
			},
		);
	};

	return (
		<DialogRoot
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);

				if (!nextOpen) {
					setName('');
					reset();
				}
			}}
		>
			<DialogContent
				title="새 폴더 만들기"
				description={parentFolderName ? `${parentFolderName} 폴더 안에 추가` : undefined}
			>
				<form onSubmit={handleSubmit}>
					<DialogBody>
						<TextField label="폴더 이름" required>
							<TextFieldInput value={name} onChange={(event) => setName(event.target.value)} autoFocus />
						</TextField>
						{error && (
							<p className="text-sm text-[var(--seed-color-fg-critical)]">폴더를 만들지 못했어요. 다시 시도해주세요.</p>
						)}
					</DialogBody>
					<DialogFooter className="gap-2" style={{ flexDirection: 'row' }}>
						<ActionButton type="button" variant="neutralWeak" flexGrow={1} onClick={() => onOpenChange(false)}>
							취소
						</ActionButton>
						<ActionButton type="submit" variant="neutralSolid" flexGrow={1} disabled={!name.trim() || isPending}>
							만들기
						</ActionButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
