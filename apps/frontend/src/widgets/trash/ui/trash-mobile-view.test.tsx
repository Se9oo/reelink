import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TrashMobileView } from '@/widgets/trash/ui/trash-mobile-view';

import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

const { mockBack } = vi.hoisted(() => ({ mockBack: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: mockBack }),
}));

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

function trashLink(overrides: Partial<TrashLink> & Pick<TrashLink, 'id'>): TrashLink {
	return {
		userId: 'user-1',
		folderId: 'f1',
		url: 'https://example.com',
		title: '링크',
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		deletedAt: '2026-10-16T00:00:00Z',
		parentFolderName: null,
		...overrides,
	};
}

describe('TrashMobileView', () => {
	test('처음엔 폴더 탭이 보이고, 링크 탭을 누르면 링크 목록으로 전환된다', async () => {
		const user = userEvent.setup();

		render(
			<TrashMobileView
				folders={[trashFolder({ id: 'f1', name: '레시피' })]}
				links={[trashLink({ id: 'l1', folderId: 'other-folder', title: '링크 제목' })]}
				onRestoreFolder={() => {}}
				onRestoreLink={() => {}}
				onDeleteFolder={() => {}}
				onDeleteLink={() => {}}
			/>,
		);

		expect(screen.getByText('레시피')).toBeInTheDocument();
		expect(screen.queryByText('링크 제목')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '링크' }));

		expect(screen.queryByText('레시피')).not.toBeInTheDocument();
		expect(screen.getByText('링크 제목')).toBeInTheDocument();
	});

	test('폴더가 없으면 빈 상태 문구를 보여준다', () => {
		render(
			<TrashMobileView
				folders={[]}
				links={[]}
				onRestoreFolder={() => {}}
				onRestoreLink={() => {}}
				onDeleteFolder={() => {}}
				onDeleteLink={() => {}}
			/>,
		);

		expect(screen.getByText('삭제된 폴더가 없어요')).toBeInTheDocument();
	});

	test('폴더 복구 버튼을 누르면 해당 폴더 id로 onRestoreFolder가 호출된다', async () => {
		const user = userEvent.setup();
		const onRestoreFolder = vi.fn();

		render(
			<TrashMobileView
				folders={[trashFolder({ id: 'f1', name: '레시피' })]}
				links={[]}
				onRestoreFolder={onRestoreFolder}
				onRestoreLink={() => {}}
				onDeleteFolder={() => {}}
				onDeleteLink={() => {}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '복구' }));

		expect(onRestoreFolder).toHaveBeenCalledWith('f1');
	});

	test('뒤로 가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
		const user = userEvent.setup();

		render(
			<TrashMobileView
				folders={[]}
				links={[]}
				onRestoreFolder={() => {}}
				onRestoreLink={() => {}}
				onDeleteFolder={() => {}}
				onDeleteLink={() => {}}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
