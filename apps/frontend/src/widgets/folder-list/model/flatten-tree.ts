import { arrayMove } from '@dnd-kit/sortable';

import { Folder, FolderTreeNode } from '@/entities/folder/model/types';

export interface FlattenedFolder extends Folder {
	depth: number;
}

/** 펼쳐진(expanded) 폴더의 자식까지만 포함해서 트리를 평탄화한다 — 접힌 폴더의 자식은 제외. */
export function flattenVisibleTree(tree: FolderTreeNode[], expandedIds: Set<string>): FlattenedFolder[] {
	function walk(nodes: FolderTreeNode[], depth: number): FlattenedFolder[] {
		return nodes.flatMap((node) => {
			const flat: FlattenedFolder = { ...node, depth };

			if (node.children.length > 0 && expandedIds.has(node.id)) {
				return [flat, ...walk(node.children, depth + 1)];
			}

			return [flat];
		});
	}

	return walk(tree, 0);
}

/** ancestorId 자신은 남기고, 그 자손들만 flat 배열에서 제거한다 — 드래그 중인 폴더의 자식들은 리스트에서 숨긴다. */
export function removeDescendants(items: FlattenedFolder[], ancestorId: string): FlattenedFolder[] {
	const excludedParentIds = new Set([ancestorId]);

	return items.filter((item) => {
		if (item.id === ancestorId) {
			return true;
		}

		if (item.parentFolderId && excludedParentIds.has(item.parentFolderId)) {
			excludedParentIds.add(item.id);
			return false;
		}

		return true;
	});
}

export interface Projection {
	depth: number;
	parentFolderId: string | null;
}

// 화면에 보이는 들여쓰기 폭(행 렌더링용) — 뎁스 계산용 드래그 민감도와는 별개로 둬서,
// 들여쓰기를 좁혀도 가로로 끌 때 의도치 않게 뎁스가 너무 쉽게 바뀌지 않게 한다
export const VISUAL_INDENT_WIDTH = 14;
const DRAG_DEPTH_THRESHOLD = 24;

/**
 * dnd-kit 공식 Sortable Tree 패턴: 세로 위치(over가 몇 번째인지)로 순서를, 가로 드래그 거리로
 * 뎁스를 계산한다. 뎁스는 바로 앞/뒤 항목의 뎁스 범위를 벗어날 수 없게 클램프하고, 그 뎁스에 맞는
 * 부모를 앞쪽 항목들을 거슬러 올라가며 찾는다.
 */
export function getProjection(
	items: FlattenedFolder[],
	activeId: string,
	overId: string,
	dragOffsetX: number,
): Projection {
	const overItemIndex = items.findIndex((item) => item.id === overId);
	const activeItemIndex = items.findIndex((item) => item.id === activeId);
	const activeItem = items[activeItemIndex];
	const newItems = arrayMove(items, activeItemIndex, overItemIndex);
	const previousItem = newItems[overItemIndex - 1] as FlattenedFolder | undefined;
	const nextItem = newItems[overItemIndex + 1] as FlattenedFolder | undefined;
	const dragDepth = Math.round(dragOffsetX / DRAG_DEPTH_THRESHOLD);
	const projectedDepth = activeItem.depth + dragDepth;
	const maxDepth = previousItem ? previousItem.depth + 1 : 0;
	const minDepth = nextItem ? nextItem.depth : 0;

	let depth = projectedDepth;

	if (projectedDepth >= maxDepth) {
		depth = maxDepth;
	} else if (projectedDepth < minDepth) {
		depth = minDepth;
	}

	return { depth, parentFolderId: getParentFolderId() };

	function getParentFolderId(): string | null {
		if (depth === 0 || !previousItem) {
			return null;
		}

		if (depth === previousItem.depth) {
			return previousItem.parentFolderId;
		}

		if (depth > previousItem.depth) {
			return previousItem.id;
		}

		const newParent = newItems
			.slice(0, overItemIndex)
			.reverse()
			.find((item) => item.depth === depth);

		return newParent?.parentFolderId ?? null;
	}
}
