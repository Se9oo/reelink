'use client';

import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { useDeleteLink } from '@/entities/link/api/delete-link';
import { Link } from '@/entities/link/model/types';
import { useRestoreItem } from '@/entities/trash/api/restore-item';

export function useLinkActions() {
	const deleteLink = useDeleteLink();
	const restoreItem = useRestoreItem();
	const snackbar = useSnackbarAdapter();

	function showFailure(message: string) {
		snackbar.create({ render: () => <Snackbar variant="critical" message={message} /> });
	}

	function onDelete(link: Link) {
		deleteLink.mutate(link.id, {
			onSuccess: () => {
				snackbar.create({
					render: () => (
						<Snackbar
							message="링크를 삭제했어요"
							actionLabel="실행 취소"
							onAction={() =>
								restoreItem.mutate({ type: 'link', id: link.id }, { onError: () => showFailure('되돌리지 못했어요') })
							}
						/>
					),
				});
			},
			onError: () => showFailure('링크를 삭제하지 못했어요'),
		});
	}

	return { onDelete };
}
