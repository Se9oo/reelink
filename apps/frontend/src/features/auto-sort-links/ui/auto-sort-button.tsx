'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { HTTPError } from 'ky';
import { ActionButton } from 'seed-design/ui/action-button';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { AutoSortPreviewDialog } from '@/features/auto-sort-links/ui/auto-sort-preview-dialog';

import {
	autoSortQuotaQueryOptions,
	AutoSortSuggestion,
	useMoveLinks,
	useSuggestAutoSort,
} from '@/entities/link/api/auto-sort';

const SUGGEST_ERROR_MESSAGES: Record<number, string> = {
	429: '오늘은 다 썼어요, 내일 다시 눌러주세요',
};

function statusOf(error: unknown): number | null {
	return error instanceof HTTPError ? error.response.status : null;
}

interface AutoSortButtonProps {
	folderId: string;
}

export function AutoSortButton({ folderId }: AutoSortButtonProps) {
	const [suggestion, setSuggestion] = useState<AutoSortSuggestion | null>(null);
	const { data: quota } = useQuery(autoSortQuotaQueryOptions());
	const suggest = useSuggestAutoSort();
	const moveLinks = useMoveLinks();
	const snackbar = useSnackbarAdapter();

	function showMessage(message: string, variant: 'default' | 'critical' = 'critical') {
		snackbar.create({ render: () => <Snackbar variant={variant} message={message} /> });
	}

	return (
		<div className="flex items-center gap-2">
			<ActionButton
				variant="neutralWeak"
				size="small"
				loading={suggest.isPending}
				disabled={quota?.remaining === 0}
				onClick={() =>
					suggest.mutate(folderId, {
						onSuccess: setSuggestion,
						onError: (error) => showMessage(SUGGEST_ERROR_MESSAGES[statusOf(error) ?? 0] ?? '잠시 후 다시 눌러주세요'),
					})
				}
			>
				폴더 자동 배치
			</ActionButton>
			{quota && (
				<span className="text-xs text-[var(--seed-color-fg-neutral-muted)]">오늘 {quota.remaining}개 남았어요</span>
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
