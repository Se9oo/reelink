import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { TrashLink } from '@/entities/trash/model/types';
import { TrashLinkRow } from '@/entities/trash/ui/trash-link-row';

function trashLink(overrides: Partial<TrashLink> & Pick<TrashLink, 'id'>): TrashLink {
	return {
		userId: 'user-1',
		folderId: 'f1',
		url: 'https://n.news.naver.com/article/123',
		title: '네이버 뉴스 기사',
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: null,
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		deletedAt: '2026-10-16T00:00:00Z',
		parentFolderName: null,
		...overrides,
	};
}

describe('TrashLinkRow', () => {
	test('제목과 호스트명, "n일 후 삭제" 뱃지를 보여준다', () => {
		render(<TrashLinkRow link={trashLink({ id: 'l1' })} daysLeft={10} onRestore={() => {}} onDelete={() => {}} />);

		expect(screen.getByText('네이버 뉴스 기사')).toBeInTheDocument();
		expect(screen.getByText('n.news.naver.com')).toBeInTheDocument();
		expect(screen.getByText('10일 후 삭제')).toBeInTheDocument();
	});

	test('제목이 없으면 호스트명을 대신 보여준다', () => {
		render(
			<TrashLinkRow
				link={trashLink({ id: 'l1', title: null })}
				daysLeft={10}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getAllByText('n.news.naver.com').length).toBeGreaterThan(0);
	});

	test('cascade로 같이 삭제된 경우에만 소속 폴더 이름 캡션을 보여준다', () => {
		const { rerender } = render(
			<TrashLinkRow
				link={trashLink({ id: 'l1', parentFolderName: '레시피' })}
				daysLeft={10}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('레시피 안에 있었음')).toBeInTheDocument();

		rerender(
			<TrashLinkRow
				link={trashLink({ id: 'l1', parentFolderName: null })}
				daysLeft={10}
				onRestore={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.queryByText('안에 있었음', { exact: false })).not.toBeInTheDocument();
	});

	test('복구 버튼을 누르면 onRestore가 호출된다', async () => {
		const user = userEvent.setup();
		const onRestore = vi.fn();

		render(<TrashLinkRow link={trashLink({ id: 'l1' })} daysLeft={10} onRestore={onRestore} onDelete={() => {}} />);

		await user.click(screen.getByRole('button', { name: '복구' }));

		expect(onRestore).toHaveBeenCalledTimes(1);
	});

	test('영구 삭제 버튼을 누르면 onDelete가 호출된다', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();

		render(<TrashLinkRow link={trashLink({ id: 'l1' })} daysLeft={10} onRestore={() => {}} onDelete={onDelete} />);

		await user.click(screen.getByRole('button', { name: '영구 삭제' }));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});
});
