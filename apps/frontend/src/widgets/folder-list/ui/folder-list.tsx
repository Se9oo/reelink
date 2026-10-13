'use client';

import { useState } from 'react';

import {
	closestCenter,
	DndContext,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove } from '@dnd-kit/sortable';
import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import {
	computeInsertIndex,
	type DropZone,
	type FlattenedFolder,
	flattenVisibleTree,
	getDropZone,
	getProjection,
	type Projection,
	removeDescendants,
	VISUAL_INDENT_WIDTH,
} from '@/widgets/folder-list/model/flatten-tree';
import { FolderRow } from '@/widgets/folder-list/ui/folder-row';

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
	const [dropZone, setDropZone] = useState<DropZone | null>(null);

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
				: getProjection(sortableItems, activeItem.id, overId, dropZone ?? 'after')
			: null;
	// getProjection이 'inside' 판정일 때만 parentFolderId를 overId로 돌려주므로, 이 둘이 같으면
	// 지금 타겟 위에서 자식으로 들어가는 중이라는 뜻 — 그 행을 하이라이트하는 데 재사용한다
	const nestTargetId = projected && overId && projected.parentFolderId === overId ? overId : null;
	const insertLine =
		activeItem && !activeItem.isSystem && overId && overId !== activeId && (dropZone === 'before' || dropZone === 'after')
			? { targetId: overId, position: dropZone === 'before' ? ('top' as const) : ('bottom' as const) }
			: null;

	function resetDragState() {
		setActiveId(null);
		setOverId(null);
		setDropZone(null);
	}

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
		setOverId(String(event.active.id));
		setDropZone(null);
	}

	// overId와 dropZone을 onDragOver/onDragMove로 나눠서 각자 업데이트하면, 콜백이 서로 다른
	// 타이밍에 호출될 때 "새 타겟인데 옛 zone" 같은 한 프레임짜리 불일치가 생길 수 있다 —
	// 같은 event.over 스냅샷에서 항상 같이 계산해서 그 레이스를 없앤다.
	function handleDragMove(event: DragMoveEvent) {
		if (!event.over) {
			setOverId(null);
			setDropZone(null);
			return;
		}

		// 드래그 중인 행 전체가 핸들이라, 오버레이 rect 중심을 쓰면 어디를 잡았느냐에 따라 실제
		// 커서랑 최대 반 행 높이(~14px)까지 어긋난다 — activatorEvent(드래그 시작 시점 포인터) +
		// 누적 이동량(delta)을 더해서 지금 진짜 커서 Y 좌표를 구한다
		const activatorEvent = event.activatorEvent;
		const startY = 'clientY' in activatorEvent ? (activatorEvent as PointerEvent).clientY : null;

		if (startY === null) {
			setOverId(null);
			setDropZone(null);
			return;
		}

		const pointerY = startY + event.delta.y;

		setOverId(String(event.over.id));
		setDropZone(getDropZone(event.over.rect, pointerY));
	}

	function handleDragEnd() {
		if (activeItem && overId && projected) {
			applyProjection(activeItem, overId, projected);
		}

		resetDragState();
	}

	function applyProjection(draggedItem: FlattenedFolder, dropOverId: string, result: Projection) {
		// 아직 다른 행으로 안 옮겨간 상태(자기 자신 위) — 아무것도 안 바뀐 거라 바로 종료.
		// 안 그러면 zone이 'after'로 잡힐 때 computeInsertIndex가 바로 다음 형제랑 자리를 바꿔버림
		if (draggedItem.id === dropOverId) {
			return;
		}

		const activeIndex = sortableItems.findIndex((item) => item.id === draggedItem.id);
		const overIndex = sortableItems.findIndex((item) => item.id === dropOverId);

		if (activeIndex === -1 || overIndex === -1) {
			return;
		}

		const insertIndex = computeInsertIndex(activeIndex, overIndex, dropZone ?? 'after');
		const reordered = arrayMove(sortableItems, activeIndex, insertIndex);

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
					modifiers={[restrictToVerticalAxis]}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
					onDragCancel={resetDragState}
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
								onRequestCreate={(parentId, parentName) => setCreateTarget({ parentId, parentName })}
							/>
						))}
					</ul>
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
