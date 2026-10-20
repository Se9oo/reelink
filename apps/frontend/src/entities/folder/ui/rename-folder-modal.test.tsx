import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RenameFolderModal } from '@/entities/folder/ui/rename-folder-modal';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { patch: vi.fn() },
}));

function renderModal(onOpenChange = vi.fn()) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<RenameFolderModal open onOpenChange={onOpenChange} folderId="f1" currentName="개발" />
		</QueryClientProvider>,
	);

	return onOpenChange;
}

describe('RenameFolderModal', () => {
	beforeEach(() => {
		vi.mocked(apiClient.patch)
			.mockReset()
			.mockReturnValue({ json: async () => ({ id: 'f1', name: '프론트엔드' }) } as never);
	});

	test('현재 이름이 채워져 있고, 바꾸기 전이나 공백뿐이면 저장할 수 없다', async () => {
		const user = userEvent.setup();
		renderModal();

		const input = screen.getByRole('textbox', { name: /폴더 이름/ });

		expect(input).toHaveValue('개발');
		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

		await user.clear(input);
		await user.type(input, '   ');

		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
	});

	test('새 이름을 저장하면 앞뒤 공백을 지워 이름 변경 API를 호출하고 창을 닫는다', async () => {
		const user = userEvent.setup();
		const onOpenChange = renderModal();

		const input = screen.getByRole('textbox', { name: /폴더 이름/ });
		await user.clear(input);
		await user.type(input, '  프론트엔드  ');
		await user.click(screen.getByRole('button', { name: '저장' }));

		expect(apiClient.patch).toHaveBeenCalledWith('folders/f1', { json: { name: '프론트엔드' } });
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	test('이름 변경에 실패하면 오류 문구를 보여준다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.patch).mockReturnValue({ json: async () => Promise.reject(new Error('fail')) } as never);
		renderModal();

		const input = screen.getByRole('textbox', { name: /폴더 이름/ });
		await user.clear(input);
		await user.type(input, '새 이름');
		await user.click(screen.getByRole('button', { name: '저장' }));

		expect(await screen.findByText('이름을 바꾸지 못했어요. 다시 시도해주세요.')).toBeInTheDocument();
	});
});
