import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TrashFolder, TrashLink } from '@/entities/trash/model/types';
import { TrashFolderRow } from '@/entities/trash/ui/trash-folder-row';

function trashFolder(overrides: Partial<TrashFolder> & Pick<TrashFolder, 'id' | 'name'>): TrashFolder {
	return {
		userId: 'user-1',
		parentFolderId: null,
		sortOrder: 0,
		isSystem: false,
		deletedAt: '2026-10-16T00:00:00Z',
		parentName: null,
		...overrides,
	};
}

describe('TrashFolderRow', () => {
	test('폴더 이름과 "n일 후 삭제" 뱃지를 보여준다', () => {
		render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '레시피' })}
				daysLeft={27}
				subfolders={[]}
				links={[]}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('레시피')).toBeInTheDocument();
		expect(screen.getByText('27일 후 삭제')).toBeInTheDocument();
	});

	test('cascade로 같이 삭제된 경우에만 부모 이름 캡션을 보여준다', () => {
		const { rerender } = render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '한식', parentName: '레시피' })}
				daysLeft={27}
				subfolders={[]}
				links={[]}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('레시피 안에 있었음')).toBeInTheDocument();

		rerender(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '한식', parentName: null })}
				daysLeft={27}
				subfolders={[]}
				links={[]}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.queryByText('안에 있었음', { exact: false })).not.toBeInTheDocument();
	});

	test('하위 항목이 없으면 펼치기 버튼이 없다', () => {
		render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '빈 폴더' })}
				daysLeft={5}
				subfolders={[]}
				links={[]}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.queryByRole('button', { name: '하위 항목 펼치기' })).not.toBeInTheDocument();
		expect(screen.getByText('비어 있음')).toBeInTheDocument();
	});

	test('하위 항목이 있으면 펼치기 버튼을 눌러 미리보기를 보여주고 다시 누르면 숨긴다', async () => {
		const user = userEvent.setup();
		const subfolders: TrashFolder[] = [trashFolder({ id: 'sub1', name: '서브폴더', parentFolderId: 'f1' })];
		const links: TrashLink[] = [
			{
				id: 'l1',
				userId: 'user-1',
				folderId: 'f1',
				url: 'https://example.com',
				title: '링크 제목',
				thumbnailUrl: null,
				folderSource: 'user',
				shelfLifeDays: null,
				savedReason: null,
				status: 'unviewed',
				createdAt: '2026-10-16T00:00:00Z',
				lastRemindedAt: null,
				pinnedAt: null,
				deletedAt: '2026-10-16T00:00:00Z',
				parentFolderName: '레시피',
			},
		];

		render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '레시피' })}
				daysLeft={27}
				subfolders={subfolders}
				links={links}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		const toggle = screen.getByRole('button', { name: '하위 항목 펼치기' });
		const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(panel).toHaveAttribute('inert');

		await user.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(panel).not.toHaveAttribute('inert');
		expect(panel).toHaveTextContent('서브폴더');
		expect(panel).toHaveTextContent('링크 제목');

		await user.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(panel).toHaveAttribute('inert');
	});

	test('복구 버튼을 누르면 onRestore가 호출된다', async () => {
		const user = userEvent.setup();
		const onRestore = vi.fn();

		render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '레시피' })}
				daysLeft={27}
				subfolders={[]}
				links={[]}
				onRestore={onRestore}
				onDelete={() => {}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '복구' }));

		expect(onRestore).toHaveBeenCalledTimes(1);
	});

	test('영구 삭제 버튼을 누르면 onDelete가 호출된다', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();

		render(
			<TrashFolderRow
				folder={trashFolder({ id: 'f1', name: '레시피' })}
				daysLeft={27}
				subfolders={[]}
				links={[]}
				onRestore={() => {}}
				onDelete={onDelete}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '영구 삭제' }));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});
});
