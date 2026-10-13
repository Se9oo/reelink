import { arrayMove } from '@dnd-kit/sortable';
import { describe, expect, test } from 'vitest';

import { computeInsertIndex, getDropZone, getProjection } from '@/widgets/folder-list/model/flatten-tree';
import type { FlattenedFolder } from '@/widgets/folder-list/model/flatten-tree';

function folder(overrides: Partial<FlattenedFolder> & Pick<FlattenedFolder, 'id' | 'depth'>): FlattenedFolder {
	return {
		userId: 'user-1',
		name: overrides.id,
		parentFolderId: null,
		sortOrder: 0,
		isSystem: false,
		deletedAt: null,
		...overrides,
	};
}

describe('getDropZone', () => {
	test('위쪽 30% 안이면 before를 반환한다', () => {
		expect(getDropZone({ top: 0, height: 100 }, 10)).toBe('before');
	});

	test('가운데 40% 안이면 inside를 반환한다', () => {
		expect(getDropZone({ top: 0, height: 100 }, 50)).toBe('inside');
	});

	test('아래쪽 30% 안이면 after를 반환한다', () => {
		expect(getDropZone({ top: 0, height: 100 }, 90)).toBe('after');
	});
});

describe('getProjection', () => {
	const items: FlattenedFolder[] = [
		folder({ id: 'a', depth: 0 }),
		folder({ id: 'b', depth: 0, parentFolderId: null }),
		folder({ id: 'b1', depth: 1, parentFolderId: 'b' }),
		folder({ id: 'c', depth: 0 }),
	];

	test('before/after 구간이면 타겟과 같은 뎁스·부모의 형제가 된다', () => {
		expect(getProjection(items, 'a', 'b1', 'before')).toEqual({ depth: 1, parentFolderId: 'b' });
		expect(getProjection(items, 'a', 'b1', 'after')).toEqual({ depth: 1, parentFolderId: 'b' });
	});

	test('inside 구간이면 타겟의 자식이 된다', () => {
		expect(getProjection(items, 'a', 'c', 'inside')).toEqual({ depth: 1, parentFolderId: 'c' });
	});

	test('타겟이 시스템 폴더면 inside여도 자식으로 안 들어가고 형제로 취급한다', () => {
		const withSystem = [...items, folder({ id: 'sys', depth: 0, isSystem: true })];

		expect(getProjection(withSystem, 'a', 'sys', 'inside')).toEqual({ depth: 0, parentFolderId: null });
	});
});

describe('computeInsertIndex', () => {
	const order = ['a', 'b', 'c'];

	function resultOrder(activeIndex: number, overIndex: number, zone: 'before' | 'inside' | 'after') {
		const insertIndex = computeInsertIndex(activeIndex, overIndex, zone);
		return arrayMove(order, activeIndex, insertIndex);
	}

	test('아래로 끌 때 before면 타겟 바로 앞에 놓인다', () => {
		expect(resultOrder(0, 2, 'before')).toEqual(['b', 'a', 'c']);
	});

	test('아래로 끌 때 after/inside면 타겟 바로 뒤에 놓인다', () => {
		expect(resultOrder(0, 2, 'after')).toEqual(['b', 'c', 'a']);
		expect(resultOrder(0, 2, 'inside')).toEqual(['b', 'c', 'a']);
	});

	test('위로 끌 때 before면 타겟 바로 앞에 놓인다', () => {
		expect(resultOrder(2, 0, 'before')).toEqual(['c', 'a', 'b']);
	});

	test('위로 끌 때 after/inside면 타겟 바로 뒤에 놓인다', () => {
		expect(resultOrder(2, 0, 'after')).toEqual(['a', 'c', 'b']);
		expect(resultOrder(2, 0, 'inside')).toEqual(['a', 'c', 'b']);
	});
});
