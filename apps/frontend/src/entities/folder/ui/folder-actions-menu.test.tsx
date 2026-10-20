import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { FolderActionsMenu } from '@/entities/folder/ui/folder-actions-menu';

function renderMenu(overrides: Partial<Parameters<typeof FolderActionsMenu>[0]> = {}) {
	const props = {
		folderName: '개발',
		isSystem: false,
		onCreateChild: vi.fn(),
		onRename: vi.fn(),
		onDelete: vi.fn(),
		...overrides,
	};

	render(<FolderActionsMenu {...props} />);

	return props;
}

describe('FolderActionsMenu', () => {
	test('메뉴에서 각 항목을 누르면 해당 동작이 호출된다', async () => {
		const user = userEvent.setup();
		const props = renderMenu();

		await user.click(screen.getByRole('button', { name: '개발 폴더 메뉴' }));
		await user.click(await screen.findByRole('menuitem', { name: '하위 폴더 만들기' }));
		await user.click(screen.getByRole('button', { name: '개발 폴더 메뉴' }));
		await user.click(await screen.findByRole('menuitem', { name: '이름 변경' }));
		await user.click(screen.getByRole('button', { name: '개발 폴더 메뉴' }));
		await user.click(await screen.findByRole('menuitem', { name: '삭제' }));

		expect(props.onCreateChild).toHaveBeenCalledTimes(1);
		expect(props.onRename).toHaveBeenCalledTimes(1);
		expect(props.onDelete).toHaveBeenCalledTimes(1);
	});

	test('시스템 폴더는 이름 변경 항목이 없다', async () => {
		const user = userEvent.setup();
		renderMenu({ folderName: '미분류', isSystem: true });

		await user.click(screen.getByRole('button', { name: '미분류 폴더 메뉴' }));

		expect(await screen.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '이름 변경' })).not.toBeInTheDocument();
	});
});
