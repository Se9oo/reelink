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
		deletedAt: null,
		...overrides,
	};
}

describe('LinkRow', () => {
	test('제목·저장 이유·호스트명을 보여주고 새 탭으로 여는 링크를 건다', () => {
		render(<LinkRow link={link()} onMove={() => {}} onDelete={() => {}} />);

		const anchor = screen.getByRole('link');

		expect(anchor).toHaveAttribute('href', 'https://n.news.naver.com/article/123');
		expect(anchor).toHaveAttribute('target', '_blank');
		expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
		expect(screen.getByText('네이버 뉴스 기사')).toBeInTheDocument();
		expect(screen.getByText('나중에 다시 읽기')).toBeInTheDocument();
		expect(screen.getByText('n.news.naver.com')).toBeInTheDocument();
	});

	test('제목이 없으면 호스트명을 제목으로 보여준다', () => {
		render(<LinkRow link={link({ title: null })} onMove={() => {}} onDelete={() => {}} />);

		expect(screen.getAllByText('n.news.naver.com')).toHaveLength(2);
	});

	test('저장 이유가 없으면 안내 문구를 보여준다', () => {
		render(<LinkRow link={link({ savedReason: null })} onMove={() => {}} onDelete={() => {}} />);

		expect(screen.getByText('저장 이유 없음')).toBeInTheDocument();
	});

	test('folderPath가 있을 때만 폴더 경로 캡션을 보여준다', () => {
		const { rerender } = render(
			<LinkRow link={link()} folderPath="개발 > React" onMove={() => {}} onDelete={() => {}} />,
		);

		expect(screen.getByText('개발 > React 안에 있음')).toBeInTheDocument();

		rerender(<LinkRow link={link()} onMove={() => {}} onDelete={() => {}} />);

		expect(screen.queryByText('안에 있음', { exact: false })).not.toBeInTheDocument();
	});

	test('썸네일이 있으면 이미지를 보여준다', () => {
		const { container } = render(
			<LinkRow link={link({ thumbnailUrl: 'https://img.example.com/a.png' })} onMove={() => {}} onDelete={() => {}} />,
		);

		expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/a.png');
	});

	test('더보기 메뉴에서 폴더 이동을 누르면 onMove가 호출된다', async () => {
		const user = userEvent.setup();
		const onMove = vi.fn();

		render(<LinkRow link={link()} onMove={onMove} onDelete={() => {}} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '폴더 이동' }));

		expect(onMove).toHaveBeenCalledTimes(1);
	});

	test('더보기 메뉴에서 삭제를 누르면 onDelete가 호출된다', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();

		render(<LinkRow link={link()} onMove={() => {}} onDelete={onDelete} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));
		await user.click(await screen.findByRole('menuitem', { name: '삭제' }));

		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	test('onMove를 넘기지 않으면 메뉴에 폴더 이동이 없다', async () => {
		const user = userEvent.setup();

		render(<LinkRow link={link()} onDelete={() => {}} />);

		await user.click(screen.getByRole('button', { name: '더보기' }));

		expect(await screen.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '폴더 이동' })).not.toBeInTheDocument();
	});
});
