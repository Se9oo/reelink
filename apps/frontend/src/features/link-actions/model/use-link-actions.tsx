'use client';

import { overlay } from 'overlay-kit';
import { Snackbar, useSnackbarAdapter } from 'seed-design/ui/snackbar';

import { EditLinkDialog } from '@/features/link-actions/ui/edit-link-dialog';
import { MoveLinkDialog } from '@/features/link-actions/ui/move-link-dialog';

import { useDeleteLink } from '@/entities/link/api/delete-link';
import { useMoveLink } from '@/entities/link/api/move-link';
import { usePinLink } from '@/entities/link/api/pin-link';
import { useUpdateLink } from '@/entities/link/api/update-link';
import { Link } from '@/entities/link/model/types';
import { useRestoreItem } from '@/entities/trash/api/restore-item';

interface UpdatedCallback {
	onUpdated?: (link: Link) => void;
}

export function useLinkActions() {
	const deleteLink = useDeleteLink();
	const moveLink = useMoveLink();
	const updateLink = useUpdateLink();
	const pinLink = usePinLink();
	const restoreItem = useRestoreItem();
	const snackbar = useSnackbarAdapter();

	function showFailure(message: string) {
		snackbar.create({ render: () => <Snackbar variant="critical" message={message} /> });
	}

	function onDelete(link: Link, callbacks: { onFailed?: () => void; onRestored?: () => void } = {}) {
		deleteLink.mutate(link.id, {
			onSuccess: () => {
				snackbar.create({
					render: () => (
						<Snackbar
							message="링크를 삭제했어요"
							actionLabel="실행 취소"
							onAction={() =>
								restoreItem.mutate(
									{ type: 'link', id: link.id },
									{ onSuccess: callbacks.onRestored, onError: () => showFailure('되돌리지 못했어요') },
								)
							}
						/>
					),
				});
			},
			onError: () => {
				callbacks.onFailed?.();
				showFailure('링크를 삭제하지 못했어요');
			},
		});
	}

	function moveTo(link: Link, folderId: string, { onUpdated }: UpdatedCallback) {
		moveLink.mutate(
			{ linkId: link.id, folderId },
			{
				onSuccess: (moved) => {
					onUpdated?.(moved);
					snackbar.create({
						render: () => (
							<Snackbar
								message="링크를 옮겼어요"
								actionLabel="실행 취소"
								onAction={() =>
									moveLink.mutate(
										{ linkId: link.id, folderId: link.folderId },
										{
											onSuccess: (restored) => {
												onUpdated?.(restored);

												if (link.pinnedAt) {
													pinLink.mutate(
														{ linkId: link.id, pinned: true },
														{ onSuccess: (repinned) => onUpdated?.(repinned) },
													);
												}
											},
											onError: () => showFailure('되돌리지 못했어요'),
										},
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

	function onMove(link: Link, callbacks: UpdatedCallback = {}) {
		overlay.open(({ isOpen, close }) => (
			<MoveLinkDialog
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				currentFolderId={link.folderId}
				onConfirm={(folderId) => moveTo(link, folderId, callbacks)}
			/>
		));
	}

	function onEdit(link: Link, { onUpdated }: UpdatedCallback = {}) {
		overlay.open(({ isOpen, close }) => (
			<EditLinkDialog
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				link={link}
				onSave={(values) =>
					updateLink.mutate(
						{ linkId: link.id, ...values },
						{
							onSuccess: (updated) => {
								onUpdated?.(updated);
								snackbar.create({ render: () => <Snackbar message="링크를 수정했어요" /> });
							},
							onError: () => showFailure('링크를 수정하지 못했어요'),
						},
					)
				}
			/>
		));
	}

	function onTogglePin(link: Link) {
		pinLink.mutate(
			{ linkId: link.id, pinned: link.pinnedAt === null },
			{ onError: () => showFailure('고정 상태를 바꾸지 못했어요') },
		);
	}

	function onCopy(link: Link) {
		navigator.clipboard.writeText(link.url).then(
			() => snackbar.create({ render: () => <Snackbar message="링크를 복사했어요" /> }),
			() => showFailure('링크를 복사하지 못했어요'),
		);
	}

	return { onDelete, onMove, onEdit, onTogglePin, onCopy };
}
