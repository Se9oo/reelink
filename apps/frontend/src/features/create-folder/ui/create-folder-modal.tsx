'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { TextField, TextFieldInput } from 'seed-design/ui/text-field';

import { createFolder } from '@/entities/folder/api/create-folder';
import { folderKeys } from '@/entities/folder/api/folder-keys';
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
	const queryClient = useQueryClient();

	const { mutate, isPending, error } = useMutation({
		mutationFn: createFolder,
		onSuccess: (folder) => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			setName('');
			onOpenChange(false);
			onCreated?.(folder);
		},
	});

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		if (!name.trim()) {
			return;
		}

		mutate({ name: name.trim(), parentFolderId });
	};

	return (
		<DialogRoot
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);

				if (!nextOpen) {
					setName('');
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
					<DialogFooter>
						<ActionButton type="button" variant="neutralWeak" onClick={() => onOpenChange(false)}>
							취소
						</ActionButton>
						<ActionButton type="submit" variant="neutralSolid" disabled={!name.trim() || isPending}>
							만들기
						</ActionButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
