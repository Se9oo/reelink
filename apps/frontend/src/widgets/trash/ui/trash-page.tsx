'use client';

import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { TrashDesktopView } from '@/widgets/trash/ui/trash-desktop-view';
import { TrashMobileView } from '@/widgets/trash/ui/trash-mobile-view';

import { trashQueryOptions } from '@/entities/trash/api/get-trash';
import { useRestoreItem } from '@/entities/trash/api/restore-item';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';
import { PermanentDeleteDialog } from '@/entities/trash/ui/permanent-delete-dialog';

function openPermanentDeleteDialog(type: 'folder' | 'link', id: string, name: string) {
	overlay.open(({ isOpen, close }) => (
		<PermanentDeleteDialog open={isOpen} onOpenChange={(open) => !open && close()} type={type} id={id} name={name} />
	));
}

export function TrashPage() {
	const { data } = useQuery(trashQueryOptions());
	const restoreItem = useRestoreItem();

	if (!data) {
		return null;
	}

	const handlers = {
		onRestoreFolder: (id: string) => restoreItem.mutate({ type: 'folder', id }),
		onRestoreLink: (id: string) => restoreItem.mutate({ type: 'link', id }),
		onDeleteFolder: (folder: TrashFolder) => openPermanentDeleteDialog('folder', folder.id, folder.name),
		onDeleteLink: (link: TrashLink) =>
			openPermanentDeleteDialog('link', link.id, link.title ?? new URL(link.url).hostname),
	};

	return (
		<div className="min-h-full bg-[var(--app-bg-canvas)]">
			<TrashMobileView folders={data.folders} links={data.links} {...handlers} />
			<TrashDesktopView folders={data.folders} links={data.links} {...handlers} />
		</div>
	);
}
