import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { FolderRow } from '@/widgets/folder-list/ui/folder-row';

const { mockPathname } = vi.hoisted(() => ({ mockPathname: vi.fn(() => '/home') }));

vi.mock('next/navigation', () => ({
	usePathname: mockPathname,
}));

function renderRow() {
	render(
		<DndContext>
			<ul>
				<FolderRow
					item={{
						id: 'dev',
						userId: 'u',
						name: '개발',
						parentFolderId: null,
						sortOrder: 0,
						isSystem: false,
						deletedAt: null,
						depth: 0,
					}}
					depth={0}
					hasChildren={false}
					expanded={false}
					isNestTarget={false}
					insertLinePosition={null}
					onToggle={() => {}}
					onRequestCreate={() => {}}
					onRequestRename={() => {}}
					onRequestDelete={() => {}}
				/>
			</ul>
		</DndContext>,
	);
}

describe('FolderRow', () => {
	test('폴더 이름은 폴더 상세로 가는 링크이고 브라우저 기본 드래그를 막는다', () => {
		renderRow();

		const link = screen.getByRole('link', { name: '개발' });

		expect(link).toHaveAttribute('href', '/folders/dev');
		expect(link).toHaveAttribute('draggable', 'false');
	});

	test('현재 보고 있는 폴더면 강조 스타일이 붙는다', () => {
		mockPathname.mockReturnValue('/folders/dev');
		renderRow();

		expect(screen.getByRole('link', { name: '개발' }).closest('[class*="group"]')).toHaveClass('font-semibold');
	});
});
