import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { Folder } from '@/entities/folder/model/types';
import { FolderPickerDialog } from '@/entities/folder/ui/folder-picker-dialog';

import { folderKeys } from '@/shared/api/query-keys';

function folder(id: string, name: string, isSystem = false): Folder {
	return { id, userId: 'u1', name, parentFolderId: null, sortOrder: 0, isSystem, deletedAt: null };
}

function renderDialog(props: Partial<Parameters<typeof FolderPickerDialog>[0]> = {}) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(folderKeys.all, [folder('kakao', '카카오톡으로 등록', true), folder('dev', '개발')]);
	const onConfirm = vi.fn();

	render(
		<QueryClientProvider client={queryClient}>
			<FolderPickerDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} {...props} />
		</QueryClientProvider>,
	);

	return onConfirm;
}

describe('FolderPickerDialog', () => {
	test('기본은 폴더 이동 문구이고 모든 폴더를 보여준다', () => {
		renderDialog();

		expect(screen.getByText('폴더 이동')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '이동' })).toBeInTheDocument();
		expect(screen.getByText('카카오톡으로 등록')).toBeInTheDocument();
	});

	test('excludeSystem이면 시스템 폴더를 빼고, 바꾼 문구로 고른 폴더를 넘긴다', async () => {
		const user = userEvent.setup();
		const onConfirm = renderDialog({ title: '폴더 고르기', confirmLabel: '선택', excludeSystem: true });

		expect(screen.queryByText('카카오톡으로 등록')).not.toBeInTheDocument();

		await user.click(screen.getByText('개발'));
		await user.click(screen.getByRole('button', { name: '선택' }));

		expect(onConfirm).toHaveBeenCalledWith('dev');
	});
});
