import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { FolderTreeNode } from '@/entities/folder/model/types';
import { FolderTreeSelect } from '@/entities/folder/ui/folder-tree-select';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { post: vi.fn() },
}));

function node(id: string, name: string, isSystem = false): FolderTreeNode {
	return { id, userId: 'u1', name, parentFolderId: null, sortOrder: 0, isSystem, deletedAt: null, children: [] };
}

function renderSelect(selectedId: string) {
	render(
		<QueryClientProvider client={new QueryClient()}>
			<FolderTreeSelect
				nodes={[node('kakao', '카카오톡으로 등록', true), node('dev', '개발')]}
				selectedId={selectedId}
				onSelect={vi.fn()}
			/>
		</QueryClientProvider>,
	);
}

async function createFolder(name: string) {
	const user = userEvent.setup();

	await user.click(screen.getByRole('button', { name: /새 폴더/ }));
	await user.type(await screen.findByRole('textbox', { name: /폴더 이름/ }), name);
	await user.click(screen.getByRole('button', { name: '만들기' }));
}

describe('FolderTreeSelect', () => {
	beforeEach(() => {
		vi.mocked(apiClient.post)
			.mockReset()
			.mockReturnValue({ json: async () => ({ id: 'new', name: '새것' }) } as never);
	});

	test('일반 폴더를 고른 채 새 폴더를 만들면 그 폴더 밑에 만든다', async () => {
		renderSelect('dev');

		await createFolder('프론트');

		expect(apiClient.post).toHaveBeenCalledWith('folders', { json: { name: '프론트', parentFolderId: 'dev' } });
	});

	test('시스템 폴더를 고른 채 새 폴더를 만들면 최상위에 만든다', async () => {
		renderSelect('kakao');

		await createFolder('여행');

		expect(apiClient.post).toHaveBeenCalledWith('folders', { json: { name: '여행', parentFolderId: null } });
	});
});
