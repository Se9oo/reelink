'use client';

import { useState } from 'react';

import { type DragMoveEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { useMoveFolder } from '@/entities/folder/api/move-folder';
import { useReorderFolders } from '@/entities/folder/api/reorder-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { Folder } from '@/entities/folder/model/types';

import {
	computeInsertIndex,
	type DropZone,
	type FlattenedFolder,
	flattenVisibleTree,
	getDropZone,
	getProjection,
	type Projection,
	removeDescendants,
} from '@/widgets/folder-list/model/flatten-tree';

interface InsertLine {
	targetId: string;
	position: 'top' | 'bottom';
}

/**
 * 사이드바 폴더 트리의 드래그 상태머신 + 드롭 시 서버 반영까지 담당한다. FolderList는 이 훅이
 * 내준 값만 가지고 조합/렌더링만 하면 되게 분리했다.
 */
export function useFolderDrag({
	folders,
	expandedIds,
	onFolderMoved,
}: {
	folders: Folder[];
	expandedIds: Set<string>;
	onFolderMoved: (newParentFolderId: string | null) => void;
}) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [dropZone, setDropZone] = useState<DropZone | null>(null);

	const moveFolder = useMoveFolder();
	const reorderFolders = useReorderFolders();

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const tree = buildFolderTree(folders);
	const flattenedItems = flattenVisibleTree(tree, expandedIds);
	const sortableItems = activeId ? removeDescendants(flattenedItems, activeId) : flattenedItems;
	const activeItem = activeId ? (sortableItems.find((item) => item.id === activeId) ?? null) : null;

	const projected: Projection | null =
		activeItem && overId
			? activeItem.isSystem
				? { depth: activeItem.depth, parentFolderId: activeItem.parentFolderId }
				: getProjection(sortableItems, activeItem.id, overId, dropZone ?? 'after')
			: null;
	// getProjection이 'inside' 판정일 때만 parentFolderId를 overId로 돌려주므로, 이 둘이 같으면
	// 지금 타겟 위에서 자식으로 들어가는 중이라는 뜻 — 그 행을 하이라이트하는 데 재사용한다
	const nestTargetId = projected && overId && projected.parentFolderId === overId ? overId : null;
	const insertLine: InsertLine | null =
		activeItem && !activeItem.isSystem && overId && overId !== activeId && (dropZone === 'before' || dropZone === 'after')
			? { targetId: overId, position: dropZone === 'before' ? 'top' : 'bottom' }
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

			onFolderMoved(result.parentFolderId);

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

	return {
		sensors,
		sortableItems,
		activeItem,
		projected,
		nestTargetId,
		insertLine,
		onDragStart: handleDragStart,
		onDragMove: handleDragMove,
		onDragEnd: handleDragEnd,
		onDragCancel: resetDragState,
	};
}
