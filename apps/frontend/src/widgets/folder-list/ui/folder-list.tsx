'use client';

import { useState } from 'react';

import {
	closestCenter,
	DndContext,
	type DragMoveEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import {
	type FlattenedFolder,
	flattenVisibleTree,
	getProjection,
	type Projection,
	removeDescendants,
	VISUAL_INDENT_WIDTH,
} from '@/widgets/folder-list/model/flatten-tree';
import { SortableFolderRow } from '@/widgets/folder-list/ui/sortable-folder-row';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { useMoveFolder } from '@/entities/folder/api/move-folder';
import { useReorderFolders } from '@/entities/folder/api/reorder-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

import { usePersistedToggleSet } from '@/shared/lib/use-toggle-set';

export function FolderList() {
	const { data } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = usePersistedToggleSet('sidebar-folder-expanded');
	const [createTarget, setCreateTarget] = useState<{ parentId: string | null; parentName?: string } | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [offsetX, setOffsetX] = useState(0);

	const moveFolder = useMoveFolder();
	const reorderFolders = useReorderFolders();

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	if (!data) {
		return null;
	}

	const folders = data;
	const tree = buildFolderTree(folders);
	const flattenedItems = flattenVisibleTree(tree, expandedIds);
	const sortableItems = activeId ? removeDescendants(flattenedItems, activeId) : flattenedItems;
	const activeItem = activeId ? (sortableItems.find((item) => item.id === activeId) ?? null) : null;
	const parentIdsWithChildren = new Set(folders.map((folder) => folder.parentFolderId).filter((id) => id !== null));

	const projected: Projection | null =
		activeItem && overId
			? activeItem.isSystem
				? { depth: activeItem.depth, parentFolderId: activeItem.parentFolderId }
				: getProjection(sortableItems, activeItem.id, overId, offsetX)
			: null;

	function resetDragState() {
		setActiveId(null);
		setOverId(null);
		setOffsetX(0);
	}

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
		setOverId(String(event.active.id));
		setOffsetX(0);
	}

	function handleDragMove(event: DragMoveEvent) {
		setOffsetX(event.delta.x);
	}

	function handleDragOver(event: DragOverEvent) {
		setOverId(event.over ? String(event.over.id) : null);
	}

	function handleDragEnd() {
		if (activeItem && overId && projected) {
			applyProjection(activeItem, overId, projected);
		}

		resetDragState();
	}

	function applyProjection(draggedItem: FlattenedFolder, dropOverId: string, result: Projection) {
		const activeIndex = sortableItems.findIndex((item) => item.id === draggedItem.id);
		const overIndex = sortableItems.findIndex((item) => item.id === dropOverId);

		if (activeIndex === -1 || overIndex === -1) {
			return;
		}

		const reordered = arrayMove(sortableItems, activeIndex, overIndex);

		const visibleSiblingIds = reordered
			.filter((item) => {
				const effectiveParentId = item.id === draggedItem.id ? result.parentFolderId : item.parentFolderId;
				return effectiveParentId === result.parentFolderId;
			})
			.map((item) => item.id);

		const missingSiblingIds = folders
			.filter((folder) => folder.parentFolderId === result.parentFolderId && !visibleSiblingIds.includes(folder.id))
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((folder) => folder.id);

		const newSiblingIds = [...visibleSiblingIds, ...missingSiblingIds];
		const parentChanged = draggedItem.parentFolderId !== result.parentFolderId;

		if (parentChanged) {
			moveFolder.mutate(
				{ folderId: draggedItem.id, parentFolderId: result.parentFolderId },
				{ onSuccess: () => reorderFolders.mutate(newSiblingIds) },
			);

			if (result.parentFolderId) {
				expand(result.parentFolderId);
			}

			return;
		}

		const currentSiblingIds = folders
			.filter((folder) => folder.parentFolderId === draggedItem.parentFolderId)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((folder) => folder.id);

		const orderUnchanged =
			currentSiblingIds.length === newSiblingIds.length &&
			currentSiblingIds.every((id, index) => id === newSiblingIds[index]);

		if (!orderUnchanged) {
			reorderFolders.mutate(newSiblingIds);
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between py-1 pr-0.5 pl-3">
				<span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">폴더</span>
				<button
					type="button"
					onClick={() => setCreateTarget({ parentId: null })}
					aria-label="새 폴더 만들기"
					className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-[var(--seed-color-fg-neutral-muted)] transition-colors
						hover:bg-[var(--seed-color-bg-transparent-pressed)]"
				>
					<IconPlusSmallLine size={20} />
				</button>
			</div>

			{tree.length === 0 ? (
				<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요.</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
					onDragOver={handleDragOver}
					onDragEnd={handleDragEnd}
					onDragCancel={resetDragState}
				>
					<SortableContext items={sortableItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
						<ul>
							{sortableItems.map((item) => (
								<SortableFolderRow
									key={item.id}
									item={item}
									depth={item.id === activeId && projected ? projected.depth : item.depth}
									hasChildren={parentIdsWithChildren.has(item.id)}
									expanded={expandedIds.has(item.id)}
									onToggle={toggle}
									onRequestCreate={(parentId, parentName) => setCreateTarget({ parentId, parentName })}
								/>
							))}
						</ul>
					</SortableContext>
					<DragOverlay>
						{activeItem && (
							<div
								className="flex h-8 items-center rounded-lg px-2 text-sm text-[var(--seed-color-fg-neutral)] opacity-50"
								style={{ paddingLeft: `${(projected?.depth ?? activeItem.depth) * VISUAL_INDENT_WIDTH}px` }}
							>
								{activeItem.name}
							</div>
						)}
					</DragOverlay>
				</DndContext>
			)}

			<CreateFolderModal
				open={createTarget !== null}
				onOpenChange={(open) => !open && setCreateTarget(null)}
				parentFolderId={createTarget?.parentId ?? null}
				parentFolderName={createTarget?.parentName}
				onCreated={() => {
					if (createTarget?.parentId) {
						expand(createTarget.parentId);
					}
				}}
			/>
		</div>
	);
}
