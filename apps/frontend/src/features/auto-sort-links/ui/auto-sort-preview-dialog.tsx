'use client';

import { useState } from 'react';

import { ResponsivePair } from '@seed-design/react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';

import { AutoSortRow, buildMoves, toRows } from '@/features/auto-sort-links/model/build-moves';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { FolderPickerDialog } from '@/entities/folder/ui/folder-picker-dialog';
import { AutoSortSuggestion, LinkMove } from '@/entities/link/api/auto-sort';
import { folderLinksQueryOptions } from '@/entities/link/api/get-folder-links';

import { useMediaQuery } from '@/shared/lib/use-media-query';

interface AutoSortPreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	suggestion: AutoSortSuggestion;
	isMoving: boolean;
	onConfirm: (moves: LinkMove[]) => void;
}

export function AutoSortPreviewDialog({
	open,
	onOpenChange,
	folderId,
	suggestion,
	isMoving,
	onConfirm,
}: AutoSortPreviewDialogProps) {
	const isTabletUp = useMediaQuery('(min-width: 768px)');
	const [rows, setRows] = useState(() => toRows(suggestion.suggestions));
	const [pickingLinkId, setPickingLinkId] = useState<string | null>(null);
	const { data: folders = [] } = useQuery(foldersQueryOptions());
	const { data: links = [] } = useQuery(folderLinksQueryOptions(folderId));
	const linkById = new Map(links.map((link) => [link.id, link]));
	const moves = buildMoves(rows);
	const title = `폴더 자동 배치 (${rows.length}개)`;

	function updateRow(linkId: string, patch: Partial<AutoSortRow>) {
		setRows((current) => current.map((row) => (row.linkId === linkId ? { ...row, ...patch } : row)));
	}

	const body = (
		<div className="flex flex-col gap-3">
			<ul className="flex flex-col">
				{rows.map((row) => {
					const link = linkById.get(row.linkId);
					const label = link ? (link.title ?? new URL(link.url).hostname) : '삭제된 링크';

					return (
						<li key={row.linkId} className="flex items-center gap-3 py-2">
							<input
								type="checkbox"
								aria-label={label}
								checked={row.checked}
								disabled={row.folderId === null}
								onChange={(event) => updateRow(row.linkId, { checked: event.target.checked })}
								className="size-5 shrink-0 cursor-pointer accent-[var(--seed-color-bg-brand-solid)]"
							/>
							<span className="min-w-0 flex-1 truncate text-sm text-[var(--seed-color-fg-neutral)]">{label}</span>
							{row.folderId === null && (
								<span className="shrink-0 text-xs text-[var(--seed-color-fg-neutral-muted)]">맞는 폴더 없음</span>
							)}
							<button
								type="button"
								onClick={() => setPickingLinkId(row.linkId)}
								className="max-w-[45%] shrink-0 cursor-pointer truncate rounded-full border
									border-[var(--seed-color-stroke-neutral-muted)] px-2.5 py-1 text-xs font-medium
									text-[var(--seed-color-fg-neutral)]"
							>
								{row.folderId ? buildFolderPath(folders, row.folderId) : '폴더 고르기'}
							</button>
						</li>
					);
				})}
			</ul>
			{suggestion.skipped > 0 && (
				<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">
					나머지 {suggestion.skipped}개는 내일 다시 눌러주세요
				</p>
			)}
			<p className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
				링크 제목, 설명, URL, 저장 이유와 폴더 이름, 폴더 안 링크 제목이 Anthropic(Claude)으로 보내져요
			</p>
			{pickingLinkId && (
				<FolderPickerDialog
					open
					onOpenChange={(nextOpen) => !nextOpen && setPickingLinkId(null)}
					title="폴더 고르기"
					confirmLabel="선택"
					excludeSystem
					onConfirm={(pickedFolderId) =>
						updateRow(pickingLinkId, { folderId: pickedFolderId, source: 'user', checked: true })
					}
				/>
			)}
		</div>
	);

	const footer = (
		<ResponsivePair gap="x2">
			<ActionButton variant="neutralWeak" onClick={() => onOpenChange(false)} flexGrow={1}>
				취소
			</ActionButton>
			<ActionButton
				variant="brandSolid"
				disabled={moves.length === 0}
				loading={isMoving}
				onClick={() => onConfirm(moves)}
				flexGrow={1}
			>
				{`${moves.length}개 옮기기`}
			</ActionButton>
		</ResponsivePair>
	);

	if (isTabletUp) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent title={title}>
					<DialogBody>{body}</DialogBody>
					<DialogFooter>{footer}</DialogFooter>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title={title}>
				<BottomSheetBody>{body}</BottomSheetBody>
				<BottomSheetFooter>{footer}</BottomSheetFooter>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}
