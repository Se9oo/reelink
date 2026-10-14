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

// 화면에 보이는 들여쓰기 폭(행 렌더링용)
export const VISUAL_INDENT_WIDTH = 14;

export type DropZone = 'before' | 'inside' | 'after';

/** 리스트 맨 아래 빈 공간의 드롭 대상 id — 최상위 폴더 맨 뒤로 보내는 용도. */
export const ROOT_DROP_ZONE_ID = '__root-drop-zone__';

/**
 * 타겟 행의 사각형(top/height)과 드래그 중인 포인터의 세로 좌표를 비교해서, 행의 위쪽 30%/
 * 가운데 40%/아래쪽 30% 중 어디에 있는지 판정한다 (노션 사이드바 드래그 방식).
 */
export function getDropZone(overRect: { top: number; height: number }, pointerY: number): DropZone {
	const ratio = (pointerY - overRect.top) / overRect.height;

	if (ratio < 0.3) {
		return 'before';
	}

	if (ratio > 0.7) {
		return 'after';
	}

	return 'inside';
}

/**
 * zone이 'inside'면(그리고 타겟이 시스템 폴더가 아니면) 타겟의 자식이 되고,
 * 'before'/'after'면 타겟과 같은 뎁스·부모를 가진 형제가 된다. 형제들 사이 정확히 어디에
 * 놓이는지는 computeInsertIndex가 계산한다.
 */
export function getProjection(items: FlattenedFolder[], activeId: string, overId: string, zone: DropZone): Projection {
	const overItem = items.find((item) => item.id === overId);

	if (!overItem) {
		return { depth: 0, parentFolderId: null };
	}

	// 자기 자신 위에서 놓으면(= 아직 다른 항목으로 안 옮겨간 상태) 제자리로 취급 —
	// 안 그러면 'inside' 판정 시 자기 자신이 자기 부모가 되어버림
	if (overId === activeId) {
		return { depth: overItem.depth, parentFolderId: overItem.parentFolderId };
	}

	if (zone === 'inside' && !overItem.isSystem) {
		return { depth: overItem.depth + 1, parentFolderId: overItem.id };
	}

	return { depth: overItem.depth, parentFolderId: overItem.parentFolderId };
}

/**
 * dnd-kit의 arrayMove(array, from, to)는 "from을 제거한 뒤 그 결과 배열의 to 자리에 끼워 넣는다"라,
 * to에 overIndex를 그대로 쓰면(before/after 구분 없이) 드래그 방향에 따라 결과가 달라진다 —
 * 예를 들어 아래로 끌 때 overIndex를 그대로 쓰면 오히려 타겟 뒤에 꽂힌다. 제거 후 타겟이 실제로
 * 있게 될 위치를 기준으로, before면 그 자리에 끼워서 타겟을 한 칸 밀어내고, after/inside면 그
 * 다음 자리에 끼운다.
 */
export function computeInsertIndex(activeIndex: number, overIndex: number, zone: DropZone): number {
	const postRemovalOverIndex = activeIndex < overIndex ? overIndex - 1 : overIndex;

	return zone === 'after' || zone === 'inside' ? postRemovalOverIndex + 1 : postRemovalOverIndex;
}
