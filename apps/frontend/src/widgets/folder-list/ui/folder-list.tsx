'use client';

import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { VISUAL_INDENT_WIDTH } from '@/widgets/folder-list/model/flatten-tree';
import { useFolderDrag } from '@/widgets/folder-list/model/use-folder-drag';
import { FolderRow } from '@/widgets/folder-list/ui/folder-row';
import { RootDropZone } from '@/widgets/folder-list/ui/root-drop-zone';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';
import { DeleteFolderDialog } from '@/entities/folder/ui/delete-folder-dialog';

import { usePersistedToggleSet } from '@/shared/lib/use-toggle-set';

export function FolderList() {
	const { data } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = usePersistedToggleSet('sidebar-folder-expanded');
	const folders = data ?? [];

	const { sensors, sortableItems, activeItem, projected, nestTargetId, insertLine, ...dragHandlers } = useFolderDrag({
		folders,
		expandedIds,
		onFolderMoved: (parentId) => {
			if (parentId) {
				expand(parentId);
			}
		},
	});

	if (!data) {
		return null;
	}

	const parentIdsWithChildren = new Set(folders.map((folder) => folder.parentFolderId).filter((id) => id !== null));

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

	function openDeleteDialog(id: string, name: string) {
		overlay.open(({ isOpen, close }) => (
			<DeleteFolderDialog open={isOpen} onOpenChange={(open) => !open && close()} folderId={id} folderName={name} />
		));
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between py-1 pr-0.5 pl-3">
				<span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">폴더</span>
				<button
					type="button"
					onClick={() => openCreateDialog(null)}
					aria-label="새 폴더 만들기"
					className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-[var(--seed-color-fg-neutral-muted)] transition-colors
						hover:bg-[var(--seed-color-bg-transparent-pressed)]"
				>
					<IconPlusSmallLine size={20} />
				</button>
			</div>

			{folders.length === 0 ? (
				<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요.</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					modifiers={[restrictToVerticalAxis]}
					{...dragHandlers}
				>
					<ul>
						{sortableItems.map((item) => (
							<FolderRow
								key={item.id}
								item={item}
								depth={item.depth}
								hasChildren={parentIdsWithChildren.has(item.id)}
								expanded={expandedIds.has(item.id)}
								isNestTarget={item.id === nestTargetId}
								insertLinePosition={insertLine?.targetId === item.id ? insertLine.position : null}
								onToggle={toggle}
								onRequestCreate={openCreateDialog}
								onRequestDelete={openDeleteDialog}
							/>
						))}
					</ul>
					{activeItem && <RootDropZone />}
					<DragOverlay dropAnimation={null}>
						{activeItem && (
							<div
								className="flex h-8 items-center rounded-lg bg-[var(--seed-color-bg-layer-floating)] px-2 text-sm
									text-[var(--seed-color-fg-neutral)] opacity-20"
								style={{ paddingLeft: `${(projected?.depth ?? activeItem.depth) * VISUAL_INDENT_WIDTH}px` }}
							>
								{activeItem.name}
							</div>
						)}
					</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}
