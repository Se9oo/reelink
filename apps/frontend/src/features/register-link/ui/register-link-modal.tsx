'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { FolderTreeSelect } from '@/entities/folder/ui/folder-tree-select';
import { createLink } from '@/entities/link/api/create-link';

import { folderKeys, linkKeys } from '@/shared/api/query-keys';
import { isValidHttpUrl } from '@/shared/lib/is-valid-http-url';
import { IconClipboardLine } from '@/shared/ui/icons/icon-clipboard-line';

interface RegisterLinkModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRegistered: () => void;
	initialUrl?: string;
}

export function RegisterLinkModal({ open, onOpenChange, onRegistered, initialUrl }: RegisterLinkModalProps) {
	const [url, setUrl] = useState(initialUrl ?? '');
	const [urlTouched, setUrlTouched] = useState(false);
	const [folderId, setFolderId] = useState<string | null>(null);
	const [savedReason, setSavedReason] = useState('');

	const queryClient = useQueryClient();
	const snackbar = useSnackbarAdapter();
	const { data: folders } = useQuery(foldersQueryOptions());
	const tree = folders ? buildFolderTree(folders) : [];

	const { mutate, isPending, error } = useMutation({
		mutationFn: createLink,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: folderKeys.all });
			queryClient.invalidateQueries({ queryKey: linkKeys.all });
			setUrl('');
			setUrlTouched(false);
			setFolderId(null);
			setSavedReason('');
			onRegistered();
		},
	});

	const urlInvalid = url !== '' && !isValidHttpUrl(url);
	const canReadClipboard = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';

	function showPasteFailure(message: string) {
		snackbar.create({ render: () => <Snackbar variant="critical" message={message} /> });
	}

	async function pasteUrl() {
		let text: string;

		try {
			text = (await navigator.clipboard.readText()).trim();
		} catch {
			showPasteFailure('클립보드를 읽지 못했어요, 직접 붙여넣어 주세요');
			return;
		}

		if (!text) {
			showPasteFailure('복사한 링크가 없어요');
			return;
		}

		if (!isValidHttpUrl(text)) {
			showPasteFailure('복사한 내용이 링크가 아니에요');
			return;
		}

		setUrl(text);
		setUrlTouched(true);
	}

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		if (!folderId || urlInvalid) {
			return;
		}

		mutate({ url, folderId, savedReason: savedReason || undefined });
	};

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent title="링크 등록">
				<form onSubmit={handleSubmit}>
					<DialogBody>
						<div className="flex flex-col gap-4">
							<TextField
								label="URL"
								required
								value={url}
								onValueChange={({ value }) => setUrl(value)}
								invalid={urlTouched && urlInvalid}
								errorMessage="http:// 또는 https://로 시작하는 주소를 입력해주세요"
							>
								<TextFieldInput placeholder="https://" onBlur={() => setUrlTouched(true)} />
								{canReadClipboard && (
									<button
										type="button"
										aria-label="붙여넣기"
										onClick={pasteUrl}
										className="mr-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg
											text-[var(--seed-color-fg-neutral-muted)] transition-colors duration-200
											hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]"
									>
										<IconClipboardLine size={20} />
									</button>
								)}
							</TextField>

							<FolderTreeSelect nodes={tree} selectedId={folderId} onSelect={setFolderId} />

							<TextField
								label="저장 이유"
								indicator="선택"
								value={savedReason}
								onValueChange={({ slicedValue }) => setSavedReason(slicedValue)}
								maxGraphemeCount={500}
							>
								<TextFieldTextarea placeholder="왜 저장했는지 짧게 적어두세요" className="max-h-40 overflow-y-auto" />
							</TextField>

							{error && (
								<p className="text-sm text-[var(--seed-color-fg-critical)]">등록에 실패했어요. 다시 시도해주세요.</p>
							)}
						</div>
					</DialogBody>
					<DialogFooter>
						<ActionButton
							type="submit"
							variant="brandSolid"
							disabled={!url || urlInvalid || !folderId || isPending}
							flexGrow={1}
						>
							등록하기
						</ActionButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
