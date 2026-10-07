'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogFooter } from 'seed-design/ui/dialog';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { FolderTreeSelect } from '@/features/register-link/ui/folder-tree-select';

import { folderKeys } from '@/entities/folder/api/folder-keys';
import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { createLink } from '@/entities/link/api/create-link';

export function RegisterLinkModal({ onRegistered }: { onRegistered: () => void }) {
	const [url, setUrl] = useState('');
	const [folderId, setFolderId] = useState<string | null>(null);
	const [savedReason, setSavedReason] = useState('');

	const queryClient = useQueryClient();
	const { data: folders } = useQuery(foldersQueryOptions());
	const tree = folders ? buildFolderTree(folders) : [];

	const { mutate, isPending, error } = useMutation({
		mutationFn: createLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			setUrl('');
			setFolderId(null);
			setSavedReason('');
			onRegistered();
		},
	});

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		if (!folderId) {
			return;
		}

		mutate({ url, folderId, savedReason: savedReason || undefined });
	};

	return (
		<DialogContent title="링크 등록">
			<form onSubmit={handleSubmit}>
				<DialogBody>
					<div className="flex flex-col gap-4">
						<TextField label="URL" required>
							<TextFieldInput value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
						</TextField>

						<div className="flex flex-col gap-1.5">
							<span className="text-sm font-medium text-[var(--seed-color-fg-neutral)]">폴더</span>
							<FolderTreeSelect nodes={tree} selectedId={folderId} onSelect={setFolderId} />
						</div>

						<TextField label="저장 이유" indicator="선택">
							<TextFieldTextarea
								value={savedReason}
								onChange={(event) => setSavedReason(event.target.value)}
								placeholder="왜 저장했는지 짧게 적어두세요"
							/>
						</TextField>

						{error && (
							<p className="text-sm text-[var(--seed-color-fg-critical)]">등록에 실패했어요. 다시 시도해주세요.</p>
						)}
					</div>
				</DialogBody>
				<DialogFooter>
					<ActionButton type="submit" variant="neutralSolid" disabled={!url || !folderId || isPending} flexGrow={1}>
						등록하기
					</ActionButton>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
