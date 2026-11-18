'use client';

import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { trashQueryOptions } from '@/views/trash/api/get-trash';
import { TrashFolder, TrashLink } from '@/views/trash/model/types';
import { PermanentDeleteDialog } from '@/views/trash/ui/permanent-delete-dialog';
import { TrashView } from '@/views/trash/ui/trash-view';

import { useRestoreFolder } from '@/entities/folder/api/restore-folder';
import { useRestoreLink } from '@/entities/link/api/restore-link';

function openPermanentDeleteDialog(type: 'folder' | 'link', id: string, name: string) {
	overlay.open(({ isOpen, close }) => (
		<PermanentDeleteDialog open={isOpen} onOpenChange={(open) => !open && close()} type={type} id={id} name={name} />
	));
}

export function TrashPage() {
	const { data } = useQuery(trashQueryOptions());
	const restoreFolder = useRestoreFolder();
	const restoreLink = useRestoreLink();

	if (!data) {
		return null;
	}

	const handlers = {
		onRestoreFolder: (id: string) => restoreFolder.mutate(id),
		onRestoreLink: (id: string) => restoreLink.mutate(id),
		onDeleteFolder: (folder: TrashFolder) => openPermanentDeleteDialog('folder', folder.id, folder.name),
		onDeleteLink: (link: TrashLink) =>
			openPermanentDeleteDialog('link', link.id, link.title ?? new URL(link.url).hostname),
	};

	return (
		<div className="h-full bg-[var(--seed-color-bg-layer-default)] lg:h-auto lg:min-h-full lg:bg-[var(--app-bg-canvas)]">
			<TrashView folders={data.folders} links={data.links} {...handlers} />
		</div>
	);
}
