import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TrashView } from '@/widgets/trash/ui/trash-view';

import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

const { mockBack } = vi.hoisted(() => ({ mockBack: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: mockBack }),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function deletedDaysAgo(days: number) {
	return new Date(Date.now() - days * MS_PER_DAY).toISOString();
}

function trashFolder(overrides: Partial<TrashFolder> & Pick<TrashFolder, 'id' | 'name'>): TrashFolder {
	return {
		userId: 'user-1',
		parentFolderId: null,
		sortOrder: 0,
		isSystem: false,
		deletedAt: deletedDaysAgo(0),
		parentName: null,
		...overrides,
	};
}

function trashLink(overrides: Partial<TrashLink> & Pick<TrashLink, 'id'>): TrashLink {
	return {
		userId: 'user-1',
		folderId: 'other-folder',
		url: 'https://n.news.naver.com/article/123',
		title: '링크 제목',
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: deletedDaysAgo(40),
		lastRemindedAt: null,
		remindAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: deletedDaysAgo(0),
		parentFolderName: null,
		...overrides,
	};
}

function renderView({ folders = [], links = [] }: { folders?: TrashFolder[]; links?: TrashLink[] }) {
	const handlers = {
		onRestoreFolder: vi.fn(),
		onRestoreLink: vi.fn(),
		onDeleteFolder: vi.fn(),
		onDeleteLink: vi.fn(),
	};

	render(<TrashView folders={folders} links={links} {...handlers} />);

	return handlers;
}

describe('TrashView', () => {
	test('필터 칩에 개수를, 상단에 자동 삭제 안내를 보여준다', () => {
		renderView({
			folders: [trashFolder({ id: 'f1', name: '레시피' })],
			links: [trashLink({ id: 'l1' }), trashLink({ id: 'l2' })],
		});

		expect(screen.getByRole('button', { name: '전체 3' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: '폴더 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '링크 2' })).toBeInTheDocument();
		expect(screen.getByText('휴지통에 있는 항목은 30일이 지나면 자동으로 영구 삭제돼요')).toBeInTheDocument();
	});

	test('폴더 칩을 누르면 폴더만, 링크 칩을 누르면 링크만 보여준다', async () => {
		const user = userEvent.setup();
		renderView({ folders: [trashFolder({ id: 'f1', name: '레시피' })], links: [trashLink({ id: 'l1' })] });

		await user.click(screen.getByRole('button', { name: '폴더 1' }));

		expect(screen.getByText('레시피')).toBeInTheDocument();
		expect(screen.queryByText('링크 제목')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '링크 1' }));

		expect(screen.queryByText('레시피')).not.toBeInTheDocument();
		expect(screen.getByText('링크 제목')).toBeInTheDocument();
	});

	test('3일 안에 영구 삭제될 항목은 "곧 사라져요" 그룹으로 먼저 보여준다', () => {
		renderView({
			links: [
				trashLink({ id: 'l1', title: '여유 있는 링크', deletedAt: deletedDaysAgo(3) }),
				trashLink({ id: 'l2', title: '급한 링크', deletedAt: deletedDaysAgo(28) }),
			],
		});

		const urgent = screen.getByRole('region', { name: '곧 사라져요' });
		const rest = screen.getByRole('region', { name: '나머지' });

		expect(within(urgent).getByText('급한 링크')).toBeInTheDocument();
		expect(within(urgent).getByText('2일 남음')).toBeInTheDocument();
		expect(within(rest).getByText('여유 있는 링크')).toBeInTheDocument();
	});

	test('급한 항목이 없으면 그룹 제목 없이 목록만 보여준다', () => {
		renderView({ links: [trashLink({ id: 'l1' })] });

		expect(screen.queryByRole('region', { name: '곧 사라져요' })).not.toBeInTheDocument();
		expect(screen.queryByText('나머지')).not.toBeInTheDocument();
		expect(screen.getByText('링크 제목')).toBeInTheDocument();
	});

	test('링크는 호스트명과 썸네일, cascade로 삭제됐다면 원래 폴더를 보여준다', () => {
		renderView({
			links: [trashLink({ id: 'l1', thumbnailUrl: 'https://img.example.com/a.jpg', parentFolderName: '개발' })],
		});

		expect(screen.getByText('n.news.naver.com')).toBeInTheDocument();
		expect(screen.getByText('개발 안에 있었음')).toBeInTheDocument();
		expect(document.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/a.jpg');
	});

	test('제목이 없는 링크는 호스트명을 제목으로 보여준다', () => {
		renderView({ links: [trashLink({ id: 'l1', title: null })] });

		expect(screen.getAllByText('n.news.naver.com')).toHaveLength(2);
	});

	test('폴더는 하위 항목 개수를, 비었으면 "비어 있음"을 보여준다', () => {
		renderView({
			folders: [
				trashFolder({ id: 'f1', name: '레시피' }),
				trashFolder({ id: 'f2', name: '한식', parentFolderId: 'f1', parentName: '레시피' }),
			],
			links: [trashLink({ id: 'l1', folderId: 'f1' })],
		});

		expect(screen.getByText('폴더 1 · 링크 1')).toBeInTheDocument();
		expect(screen.getByText('비어 있음')).toBeInTheDocument();
		expect(screen.getByText('레시피 안에 있었음')).toBeInTheDocument();
	});

	test('폴더의 하위 항목 펼치기를 누르면 그 안에 있던 하위 폴더·링크 이름을 보여준다', async () => {
		const user = userEvent.setup();
		renderView({
			folders: [
				trashFolder({ id: 'f1', name: '레시피' }),
				trashFolder({ id: 'f2', name: '한식', parentFolderId: 'f1', parentName: '레시피' }),
			],
			links: [trashLink({ id: 'l1', folderId: 'f1', title: '김치찌개 레시피' })],
		});

		const toggle = screen.getByRole('button', { name: '하위 항목 펼치기' });

		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await user.click(toggle);

		const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(within(panel as HTMLElement).getByText('한식')).toBeInTheDocument();
		expect(within(panel as HTMLElement).getByText('김치찌개 레시피')).toBeInTheDocument();
	});

	test('펼친 하위 링크에 썸네일이 있으면 아이콘 대신 썸네일을 보여준다', async () => {
		const user = userEvent.setup();
		renderView({
			folders: [trashFolder({ id: 'f1', name: '레시피' })],
			links: [trashLink({ id: 'l1', folderId: 'f1', thumbnailUrl: 'https://img.example.com/child.jpg' })],
		});

		const toggle = screen.getByRole('button', { name: '하위 항목 펼치기' });
		await user.click(toggle);

		const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '') as HTMLElement;

		expect(panel.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/child.jpg');
	});

	test('복구 버튼을 누르면 해당 항목 id로 복구 핸들러가 호출된다', async () => {
		const user = userEvent.setup();
		const { onRestoreFolder } = renderView({ folders: [trashFolder({ id: 'f1', name: '레시피' })] });

		await user.click(screen.getByRole('button', { name: '복구' }));

		expect(onRestoreFolder).toHaveBeenCalledWith('f1');
	});

	test('더보기 메뉴에서 영구 삭제를 누르면 해당 항목으로 삭제 핸들러가 호출된다', async () => {
		const user = userEvent.setup();
		const link = trashLink({ id: 'l1' });
		const { onDeleteLink } = renderView({ links: [link] });

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '영구 삭제' }));

		expect(onDeleteLink).toHaveBeenCalledWith(link);
	});

	test('휴지통이 비어 있으면 빈 상태 문구를 보여준다', () => {
		renderView({});

		expect(screen.getByText('휴지통이 비어 있어요')).toBeInTheDocument();
	});

	test('뒤로 가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
		const user = userEvent.setup();
		renderView({});

		await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
