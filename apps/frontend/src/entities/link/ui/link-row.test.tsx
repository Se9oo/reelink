import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { Link } from '@/entities/link/model/types';
import { LinkRow } from '@/entities/link/ui/link-row';

function link(overrides: Partial<Link> = {}): Link {
	return {
		id: 'l1',
		userId: 'user-1',
		folderId: 'f1',
		url: 'https://n.news.naver.com/article/123',
		title: '네이버 뉴스 기사',
		thumbnailUrl: null,
		folderSource: 'user',
		shelfLifeDays: null,
		savedReason: '나중에 다시 읽기',
		status: 'unviewed',
		createdAt: '2026-10-16T00:00:00Z',
		lastRemindedAt: null,
		pinnedAt: null,
		viewedAt: null,
		deletedAt: null,
		...overrides,
	};
}

describe('LinkRow', () => {
	test('제목·저장 이유·호스트명을 보여주고 새 탭으로 여는 링크를 건다', () => {
		render(<LinkRow link={link()} onMove={() => {}} onEdit={() => {}} onTogglePin={() => {}} onDelete={() => {}} />);

		const anchor = screen.getByRole('link');

		expect(anchor).toHaveAttribute('href', 'https://n.news.naver.com/article/123');
		expect(anchor).toHaveAttribute('target', '_blank');
		expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
		expect(screen.getByText('네이버 뉴스 기사')).toBeInTheDocument();
		expect(screen.getByText('나중에 다시 읽기')).toBeInTheDocument();
		expect(screen.getAllByText('n.news.naver.com')).not.toHaveLength(0);
	});

	test('호스트명 옆에 저장 시점을 보여준다', () => {
		const threeDaysAgo = new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString();

		render(
			<LinkRow
				link={link({ createdAt: threeDaysAgo })}
				onMove={() => {}}
				onEdit={() => {}}
				onTogglePin={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('3일 전 저장')).toBeInTheDocument();
	});

	test('제목이 없으면 호스트명을 제목으로 보여준다', () => {
		render(
			<LinkRow
				link={link({ title: null })}
				onMove={() => {}}
				onEdit={() => {}}
				onTogglePin={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByRole('link')).toHaveTextContent('n.news.naver.com');
	});

	test('저장 이유가 없으면 저장 이유 남기기 버튼을 누를 때 onEdit이 호출된다', async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();

		render(
			<LinkRow
				link={link({ savedReason: null })}
				onMove={() => {}}
				onTogglePin={() => {}}
				onDelete={() => {}}
				onEdit={onEdit}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '저장 이유 남기기' }));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	test('저장 이유가 있으면 저장 이유 남기기 버튼이 없다', () => {
		render(<LinkRow link={link()} onMove={() => {}} onEdit={() => {}} onTogglePin={() => {}} onDelete={() => {}} />);

		expect(screen.queryByRole('button', { name: '저장 이유 남기기' })).not.toBeInTheDocument();
	});

	test('folderPath가 있을 때만 폴더 경로 캡션을 보여준다', () => {
		const { rerender } = render(
			<LinkRow
				link={link()}
				folderPath="개발 > React"
				onMove={() => {}}
				onEdit={() => {}}
				onTogglePin={() => {}}
				onDelete={() => {}}
			/>,
		);

		expect(screen.getByText('개발 > React 안에 있음')).toBeInTheDocument();

		rerender(<LinkRow link={link()} onMove={() => {}} onEdit={() => {}} onTogglePin={() => {}} onDelete={() => {}} />);

		expect(screen.queryByText('안에 있음', { exact: false })).not.toBeInTheDocument();
	});

	test('썸네일이 있으면 이미지를 보여준다', () => {
		const { container } = render(
			<LinkRow
				link={link({ thumbnailUrl: 'https://img.example.com/a.png' })}
				onMove={() => {}}
				onEdit={() => {}}
				onDelete={() => {}}
				onTogglePin={() => {}}
			/>,
		);

		expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/a.png');
	});

	test('더보기 메뉴에서 폴더 이동을 누르면 onMove가 호출된다', async () => {
		const user = userEvent.setup();
		const onMove = vi.fn();

		render(<LinkRow link={link()} onMove={onMove} onEdit={() => {}} onTogglePin={() => {}} onDelete={() => {}} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '폴더 이동' }));

		expect(onMove).toHaveBeenCalledTimes(1);
	});

	test('더보기 메뉴에서 삭제를 누르면 onDelete가 호출된다', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();

		render(<LinkRow link={link()} onMove={() => {}} onEdit={() => {}} onTogglePin={() => {}} onDelete={onDelete} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '삭제' }));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	test('더보기 메뉴에서 수정을 누르면 onEdit이 호출된다', async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();

		render(<LinkRow link={link()} onMove={() => {}} onTogglePin={() => {}} onDelete={() => {}} onEdit={onEdit} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '수정' }));

		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	test('onMove를 넘기지 않으면 메뉴에 폴더 이동이 없다', async () => {
		const user = userEvent.setup();

		render(<LinkRow link={link()} onEdit={() => {}} onTogglePin={() => {}} onDelete={() => {}} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));

		expect(await screen.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '폴더 이동' })).not.toBeInTheDocument();
	});

	test('고정된 링크는 고정 표시가 보이고, 메뉴에 고정 해제가 있다', async () => {
		const user = userEvent.setup();
		const onTogglePin = vi.fn();

		render(
			<LinkRow
				link={link({ pinnedAt: '2026-10-20T00:00:00Z' })}
				onEdit={() => {}}
				onDelete={() => {}}
				onTogglePin={onTogglePin}
			/>,
		);

		expect(screen.getAllByLabelText('고정됨')).not.toHaveLength(0);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '고정 해제' }));

		expect(onTogglePin).toHaveBeenCalledTimes(1);
	});

	test('고정되지 않은 링크는 고정 표시가 없고, 메뉴에 상단 고정이 있다', async () => {
		const user = userEvent.setup();

		render(<LinkRow link={link()} onEdit={() => {}} onDelete={() => {}} onTogglePin={() => {}} />);

		expect(screen.queryByLabelText('고정됨')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '더보기' }));

		expect(await screen.findByRole('menuitem', { name: '상단 고정' })).toBeInTheDocument();
	});
});
