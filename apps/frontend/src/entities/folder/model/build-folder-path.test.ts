import { describe, expect, test } from 'vitest';

import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { Folder } from '@/entities/folder/model/types';

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
	return {
		userId: 'user-1',
		parentFolderId: null,
		sortOrder: 0,
		isSystem: false,
		deletedAt: null,
		...overrides,
	};
}

const folders = [
	folder({ id: 'dev', name: '개발' }),
	folder({ id: 'react', name: 'React', parentFolderId: 'dev' }),
	folder({ id: 'hooks', name: 'Hooks', parentFolderId: 'react' }),
];

describe('buildFolderPath', () => {
	test('최상위 폴더면 폴더 이름만 반환한다', () => {
		expect(buildFolderPath(folders, 'dev')).toBe('개발');
	});

	test('중첩된 폴더면 조상부터 " > "로 이어 붙인다', () => {
		expect(buildFolderPath(folders, 'react')).toBe('개발 > React');
		expect(buildFolderPath(folders, 'hooks')).toBe('개발 > React > Hooks');
	});

	test('목록에 없는 폴더 id면 빈 문자열을 반환한다', () => {
		expect(buildFolderPath(folders, 'missing')).toBe('');
	});

	test('부모가 목록에 없으면 찾을 수 있는 데까지만 반환한다', () => {
		const orphan = [folder({ id: 'child', name: '자식', parentFolderId: 'gone' })];

		expect(buildFolderPath(orphan, 'child')).toBe('자식');
	});
});
