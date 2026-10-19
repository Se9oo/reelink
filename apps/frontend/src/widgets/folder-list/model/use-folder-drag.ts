'use client';

import { useState } from 'react';

import {
	type DragMoveEvent,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import {
	computeInsertIndex,
	type DropZone,
	type FlattenedFolder,
	flattenVisibleTree,
	getDropZone,
	getProjection,
	type Projection,
	removeDescendants,
	ROOT_DROP_ZONE_ID,
} from '@/widgets/folder-list/model/flatten-tree';
import { getActivatorClientY } from '@/widgets/folder-list/model/get-activator-client-y';

import { useMoveFolder } from '@/entities/folder/api/move-folder';
import { useReorderFolders } from '@/entities/folder/api/reorder-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { Folder } from '@/entities/folder/model/types';

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

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
	);

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
	const overItem = overId ? sortableItems.find((item) => item.id === overId) : undefined;
	// 시스템 폴더는 항상 최상위라 순서 변경은 가능하지만, 다른 최상위 폴더 사이(또는 리스트 맨 아래
	// 빈 공간)에서만 유효하다 — 중첩된 폴더 앞/뒤에 올려도 실제로는 최상위에 그대로 남으므로 그
	// 경우엔 삽입선을 보여주지 않는다
	const canReorderHere =
		activeItem && (!activeItem.isSystem || overItem?.parentFolderId === null || overId === ROOT_DROP_ZONE_ID);
	const insertLine: InsertLine | null =
		canReorderHere && overId && overId !== activeId && (dropZone === 'before' || dropZone === 'after')
			? { targetId: overId, position: dropZone === 'before' ? 'top' : 'bottom' }
			: null;

	// 펼쳐진 부모 행의 after 존은 그 부모의 첫 자식 행의 before 존과 화면상 같은 경계에 있어서,
	// 몇 픽셀 차이로 "부모와 같은 레벨" vs "부모의 첫 자식"이 갈리면 어색하다 — 이 둘을 첫 자식의
	// before로 합쳐서, 부모와 같은 레벨로 두는 건 그 부모의 펼쳐진 자식 구간을 완전히 벗어났을
	// 때만(= 다음 항목이 그 부모의 자식이 아닐 때만) 되게 한다
	function resolveOverAndZone(rawOverId: string, rawZone: DropZone): { overId: string; zone: DropZone } {
		if (rawZone !== 'after') {
			return { overId: rawOverId, zone: rawZone };
		}

		const overIndex = sortableItems.findIndex((item) => item.id === rawOverId);
		const nextItem = sortableItems[overIndex + 1];

		if (nextItem && nextItem.parentFolderId === rawOverId) {
			return { overId: nextItem.id, zone: 'before' };
		}

		return { overId: rawOverId, zone: rawZone };
	}

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

		// 리스트 맨 아래 빈 공간(최상위 맨 뒤) — 실제 행이 아니라 zone 세분화가 의미 없다
		if (event.over.id === ROOT_DROP_ZONE_ID) {
			setOverId(ROOT_DROP_ZONE_ID);
			setDropZone('after');
			return;
		}

		// 드래그 중인 행 전체가 핸들이라, 오버레이 rect 중심을 쓰면 어디를 잡았느냐에 따라 실제
		// 커서랑 최대 반 행 높이(~14px)까지 어긋난다 — activatorEvent(드래그 시작 시점 포인터) +
		// 누적 이동량(delta)을 더해서 지금 진짜 커서 Y 좌표를 구한다
		const startY = getActivatorClientY(event.activatorEvent);

		if (startY === null) {
			setOverId(null);
			setDropZone(null);
			return;
		}

		const pointerY = startY + event.delta.y;
		const rawZone = getDropZone(event.over.rect, pointerY);
		const resolved = resolveOverAndZone(String(event.over.id), rawZone);

		setOverId(resolved.overId);
		setDropZone(resolved.zone);
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

		// 리스트 맨 아래 빈 공간 — 실제 행이 아니라 arrayMove/computeInsertIndex 대상이 아니므로
		// 최상위 형제 맨 뒤에 붙이는 걸로 바로 처리한다
		if (dropOverId === ROOT_DROP_ZONE_ID) {
			applyRootAppend(draggedItem);
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

	function applyRootAppend(draggedItem: FlattenedFolder) {
		const parentChanged = draggedItem.parentFolderId !== null;

		const rootSiblingIds = folders
			.filter((folder) => folder.parentFolderId === null && folder.id !== draggedItem.id)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((folder) => folder.id);

		const newSiblingIds = [...rootSiblingIds, draggedItem.id];

		if (parentChanged) {
			moveFolder.mutate(
				{ folderId: draggedItem.id, parentFolderId: null },
				{ onSuccess: () => reorderFolders.mutate(newSiblingIds) },
			);

			onFolderMoved(null);

			return;
		}

		const currentRootIds = folders
			.filter((folder) => folder.parentFolderId === null)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((folder) => folder.id);

		const orderUnchanged =
			currentRootIds.length === newSiblingIds.length &&
			currentRootIds.every((id, index) => id === newSiblingIds[index]);

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
