'use client';

import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { useFolderDrag } from '@/widgets/folder-list/model/use-folder-drag';
import { RootDropZone } from '@/widgets/folder-list/ui/root-drop-zone';
import { MOBILE_INDENT_WIDTH, MobileFolderRow } from '@/widgets/folder-tree-screen/ui/mobile-folder-row';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

import { usePersistedToggleSet } from '@/shared/lib/use-toggle-set';

export function FolderTreeScreen() {
	const { data } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = usePersistedToggleSet('mobile-folder-expanded');
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
					<ul>
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
							/>
						))}
					</ul>
					{activeItem && <RootDropZone />}
					<DragOverlay dropAnimation={null}>
						{activeItem && (
							<div
								className="flex h-11 items-center rounded-lg bg-[var(--seed-color-bg-layer-floating)] px-2 text-[15px]
									text-[var(--seed-color-fg-neutral)] opacity-60 shadow-md"
								style={{ paddingLeft: `${(projected?.depth ?? activeItem.depth) * MOBILE_INDENT_WIDTH}px` }}
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
