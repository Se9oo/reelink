'use client';

import { useRef } from 'react';

import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { DROP_ANIMATION_DURATION, useDropFlip } from '@/widgets/folder-list/model/use-drop-flip';
import { useFolderDrag } from '@/widgets/folder-list/model/use-folder-drag';
import { RootDropZone } from '@/widgets/folder-list/ui/root-drop-zone';
import { MOBILE_INDENT_WIDTH, MobileFolderRow } from '@/widgets/folder-tree-screen/ui/mobile-folder-row';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';
import { DeleteFolderDialog } from '@/entities/folder/ui/delete-folder-dialog';
import { RenameFolderModal } from '@/entities/folder/ui/rename-folder-modal';

import { usePersistedToggleSet } from '@/shared/lib/use-toggle-set';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

export function FolderTreeScreen() {
	const { data } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = usePersistedToggleSet('mobile-folder-expanded');
	const folders = data ?? [];

	const listRef = useRef<HTMLUListElement>(null);
	const captureFlip = useDropFlip(listRef);
	const { sensors, sortableItems, activeItem, projected, nestTargetId, insertLine, ...dragHandlers } = useFolderDrag({
		folders,
		expandedIds,
		onFolderMoved: (parentId) => {
			if (parentId) {
				expand(parentId);
			}
		},
		onBeforeCommit: captureFlip,
	});

	if (!data) {
		return null;
	}

	const childCountById = new Map<string, number>();

	for (const folder of folders) {
		if (folder.parentFolderId) {
			childCountById.set(folder.parentFolderId, (childCountById.get(folder.parentFolderId) ?? 0) + 1);
		}
	}

	function openCreateDialog(parentId: string | null, parentName?: string) {
		overlay.open(({ isOpen, close }) => (
			<CreateFolderModal
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				parentFolderId={parentId}
				parentFolderName={parentName}
				onCreated={() => {
					if (parentId) {
						expand(parentId);
					}
				}}
			/>
		));
	}

	function openRenameDialog(id: string, name: string) {
		overlay.open(({ isOpen, close }) => (
			<RenameFolderModal open={isOpen} onOpenChange={(open) => !open && close()} folderId={id} currentName={name} />
		));
	}

	function openDeleteDialog(id: string, name: string) {
		overlay.open(({ isOpen, close }) => (
			<DeleteFolderDialog open={isOpen} onOpenChange={(open) => !open && close()} folderId={id} folderName={name} />
		));
	}

	return (
		<div className="flex flex-col px-2 pb-32">
			<button
				type="button"
				onClick={() => openCreateDialog(null)}
				className="flex h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold
					text-[var(--seed-color-fg-brand)]"
			>
				<IconPlusSmallLine size={20} />새 폴더
			</button>

			{folders.length === 0 ? (
				<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					modifiers={[restrictToVerticalAxis]}
					{...dragHandlers}
				>
					<ul ref={listRef} className="isolate">
						{sortableItems.map((item) => (
							<MobileFolderRow
								key={item.id}
								item={item}
								hasChildren={childCountById.has(item.id)}
								childCount={childCountById.get(item.id) ?? 0}
								expanded={expandedIds.has(item.id)}
								isNestTarget={item.id === nestTargetId}
								insertLinePosition={insertLine?.targetId === item.id ? insertLine.position : null}
								onToggle={toggle}
								onRequestCreate={openCreateDialog}
								onRequestRename={openRenameDialog}
								onRequestDelete={openDeleteDialog}
							/>
						))}
					</ul>
					{activeItem && <RootDropZone />}
					<DragOverlay dropAnimation={{ duration: DROP_ANIMATION_DURATION }}>
						{activeItem && (
							<div
								className="flex h-11 items-center rounded-lg pr-1 text-[15px] text-[var(--seed-color-fg-neutral)]
									opacity-60"
								style={{ paddingLeft: `${(projected?.depth ?? activeItem.depth) * MOBILE_INDENT_WIDTH}px` }}
							>
								<span className="h-8 w-8 shrink-0" />
								<span className="flex min-w-0 flex-1 items-center gap-2">
									<IconFolderLine size={18} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
									<span className="truncate">{activeItem.name}</span>
								</span>
							</div>
						)}
					</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}
