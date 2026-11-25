'use client';

import { useState } from 'react';

import { IconSparkle2Line } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { HTTPError } from 'ky';
import { ActionButton } from 'seed-design/ui/action-button';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { AutoSortPreviewDialog } from '@/features/auto-sort-links/ui/auto-sort-preview-dialog';
import { AutoSortSelectDialog } from '@/features/auto-sort-links/ui/auto-sort-select-dialog';

import {
	autoSortQuotaQueryOptions,
	AutoSortSuggestion,
	useMoveLinks,
	useSuggestAutoSort,
} from '@/entities/link/api/auto-sort';
import { folderLinksQueryOptions } from '@/entities/link/api/get-folder-links';

const SUGGEST_ERROR_MESSAGES: Record<number, string> = {
	429: '오늘은 다 썼어요, 자정이 지나면 다시 눌러주세요',
};

function statusOf(error: unknown): number | null {
	return error instanceof HTTPError ? error.response.status : null;
}

interface AutoSortCardProps {
	folderId: string;
	linkCount: number;
}

export function AutoSortCard({ folderId, linkCount }: AutoSortCardProps) {
	const [selecting, setSelecting] = useState(false);
	const [suggestion, setSuggestion] = useState<AutoSortSuggestion | null>(null);
	const { data: quota } = useQuery(autoSortQuotaQueryOptions());
	const { data: links = [] } = useQuery(folderLinksQueryOptions(folderId));
	const suggest = useSuggestAutoSort();
	const moveLinks = useMoveLinks();
	const snackbar = useSnackbarAdapter();

	function showMessage(message: string, variant: 'default' | 'critical' = 'critical') {
		snackbar.create({ render: () => <Snackbar variant={variant} message={message} /> });
	}

	return (
		<div
			className="flex items-center gap-3 rounded-[14px] bg-[var(--seed-color-bg-brand-weak)] px-4 py-3.5 md:gap-3.5
				md:px-5 md:py-4"
		>
			<IconSparkle2Line size={22} className="shrink-0 text-[var(--seed-color-fg-brand)]" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p className="text-sm font-semibold text-[var(--seed-color-fg-neutral)] md:text-[15px]">
					링크 {linkCount}개를 폴더별로 정리해드릴게요
				</p>
				{quota && (
					<p className="text-xs text-[var(--seed-color-fg-brand)] md:text-[13px]">
						{quota.remaining === 0 ? (
							'오늘은 다 썼어요, 자정이 지나면 다시 정리할 수 있어요'
						) : (
							<>
								<span className="hidden md:inline">AI가 맞는 폴더를 추천하면 확인하고 옮길 수 있어요. </span>
								오늘 {quota.remaining}개까지 가능, 매일 자정에 초기화돼요
							</>
						)}
					</p>
				)}
			</div>
			<ActionButton
				variant="brandSolid"
				size="small"
				className="shrink-0"
				disabled={!quota || quota.remaining === 0}
				onClick={() => setSelecting(true)}
			>
				정리하기
			</ActionButton>
			{selecting && quota && (
				<AutoSortSelectDialog
					open
					onOpenChange={(open) => !open && setSelecting(false)}
					links={links}
					remaining={quota.remaining}
					isPending={suggest.isPending}
					onConfirm={(linkIds) =>
						suggest.mutate(
							{ folderId, linkIds },
							{
								onSuccess: (result) => {
									setSelecting(false);
									setSuggestion(result);
								},
								onError: (error) =>
									showMessage(SUGGEST_ERROR_MESSAGES[statusOf(error) ?? 0] ?? '잠시 후 다시 눌러주세요'),
							},
						)
					}
				/>
			)}
			{suggestion && (
				<AutoSortPreviewDialog
					open
					onOpenChange={(open) => !open && setSuggestion(null)}
					folderId={folderId}
					suggestion={suggestion}
					isMoving={moveLinks.isPending}
					onConfirm={(moves) =>
						moveLinks.mutate(moves, {
							onSuccess: () => {
								setSuggestion(null);
								showMessage(`${moves.length}개를 옮겼어요`, 'default');
							},
							onError: (error) =>
								showMessage(statusOf(error) === 404 ? '목록이 바뀌었어요, 다시 눌러주세요' : '링크를 옮기지 못했어요'),
						})
					}
				/>
			)}
		</div>
	);
}
