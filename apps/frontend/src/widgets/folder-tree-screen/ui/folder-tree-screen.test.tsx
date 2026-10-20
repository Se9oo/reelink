import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { SnackbarProvider } from 'seed-design/ui/snackbar';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { FolderTreeScreen } from '@/widgets/folder-tree-screen/ui/folder-tree-screen';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn() },
}));

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
	return { userId: 'u', parentFolderId: null, sortOrder: 0, isSystem: false, deletedAt: null, ...overrides };
}

function mockFolders(folders: Folder[]) {
	vi.mocked(apiClient.get).mockImplementation((() => ({ json: async () => folders })) as never);
}

function renderTree() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<OverlayProvider>
				<SnackbarProvider>
					<FolderTreeScreen />
				</SnackbarProvider>
			</OverlayProvider>
		</QueryClientProvider>,
	);
}

const folders = [
	folder({ id: 'dev', name: '개발', sortOrder: 0 }),
	folder({ id: 'react', name: 'React', parentFolderId: 'dev', sortOrder: 0 }),
	folder({ id: 'next', name: 'Next.js', parentFolderId: 'dev', sortOrder: 1 }),
	folder({ id: 'recipe', name: '레시피', sortOrder: 1 }),
];

async function chooseFolderMenuItem(user: ReturnType<typeof userEvent.setup>, folderName: string, itemName: string) {
	const trigger = await screen.findByRole('button', { name: `${folderName} 폴더 메뉴` });
	await user.click(trigger);

	const menu = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
	await user.click(within(menu as HTMLElement).getByRole('menuitem', { name: itemName }));
}

describe('FolderTreeScreen', () => {
	beforeEach(() => {
		vi.mocked(apiClient.get).mockReset();
		window.localStorage.clear();
	});

	test('처음엔 최상위 폴더만 보이고 하위 폴더는 접혀 있다', async () => {
		mockFolders(folders);
		renderTree();

		expect(await screen.findByRole('link', { name: /개발/ })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /레시피/ })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /React/ })).not.toBeInTheDocument();
	});

	test('쉐브론을 누르면 하위 폴더가 펼쳐지고 다시 누르면 접힌다', async () => {
		const user = userEvent.setup();
		mockFolders(folders);
		renderTree();

		await user.click(await screen.findByRole('button', { name: '개발 폴더 펼치기' }));

		expect(screen.getByRole('link', { name: /React/ })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Next\.js/ })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '개발 폴더 접기' }));

		expect(screen.queryByRole('link', { name: /React/ })).not.toBeInTheDocument();
	});

	test('폴더 이름은 폴더 상세로 가는 링크이고 하위 폴더 개수를 보여준다', async () => {
		mockFolders(folders);
		renderTree();

		const devLink = await screen.findByRole('link', { name: /개발/ });

		expect(devLink).toHaveAttribute('href', '/folders/dev');
		expect(devLink).toHaveTextContent('하위 폴더 2');
	});

	test('하위 폴더가 없는 폴더에는 펼치기 버튼이 없다', async () => {
		mockFolders(folders);
		renderTree();

		await screen.findByRole('link', { name: /레시피/ });

		expect(screen.queryByRole('button', { name: '레시피 폴더 펼치기' })).not.toBeInTheDocument();
	});

	test('폴더가 하나도 없으면 안내 문구를 보여준다', async () => {
		mockFolders([]);
		renderTree();

		expect(await screen.findByText('아직 만든 폴더가 없어요')).toBeInTheDocument();
	});

	test('폴더 메뉴에서 이름 변경을 누르면 현재 이름이 채워진 이름 변경 창이 열린다', async () => {
		const user = userEvent.setup();
		mockFolders(folders);
		renderTree();

		await chooseFolderMenuItem(user, '레시피', '이름 변경');

		expect(await screen.findByRole('textbox', { name: /폴더 이름/ })).toHaveValue('레시피');
	});

	test('폴더 메뉴에서 삭제를 누르면 삭제 확인 창이 열린다', async () => {
		const user = userEvent.setup();
		mockFolders(folders);
		renderTree();

		await chooseFolderMenuItem(user, '레시피', '삭제');

		expect(await screen.findByText('"레시피" 폴더를 삭제할까요?')).toBeInTheDocument();
	});
});
