'use client';

import { overlay } from 'overlay-kit';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { MoveLinkDialog } from '@/features/link-actions/ui/move-link-dialog';

import { useDeleteLink } from '@/entities/link/api/delete-link';
import { useMoveLink } from '@/entities/link/api/move-link';
import { Link } from '@/entities/link/model/types';
import { useRestoreItem } from '@/entities/trash/api/restore-item';

export function useLinkActions() {
	const deleteLink = useDeleteLink();
	const moveLink = useMoveLink();
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

	function moveTo(link: Link, folderId: string) {
		moveLink.mutate(
			{ linkId: link.id, folderId },
			{
				onSuccess: () => {
					snackbar.create({
						render: () => (
							<Snackbar
								message="링크를 옮겼어요"
								actionLabel="실행 취소"
								onAction={() =>
									moveLink.mutate(
										{ linkId: link.id, folderId: link.folderId },
										{ onError: () => showFailure('되돌리지 못했어요') },
									)
								}
							/>
						),
					});
				},
				onError: () => showFailure('링크를 옮기지 못했어요'),
			},
		);
	}

	function onMove(link: Link) {
		overlay.open(({ isOpen, close }) => (
			<MoveLinkDialog
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				currentFolderId={link.folderId}
				onConfirm={(folderId) => moveTo(link, folderId)}
			/>
		));
	}

	return { onDelete, onMove };
}
