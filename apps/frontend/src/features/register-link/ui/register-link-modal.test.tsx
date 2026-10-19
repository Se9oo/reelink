import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { Folder } from '@/entities/folder/model/types';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

const folders: Folder[] = [
	{ id: 'f1', userId: 'u', parentFolderId: null, name: '개발', sortOrder: 0, isSystem: false, deletedAt: null },
];

function renderModal() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

	render(
		<QueryClientProvider client={queryClient}>
			<RegisterLinkModal open onOpenChange={() => {}} onRegistered={() => {}} />
		</QueryClientProvider>,
	);
}

describe('RegisterLinkModal', () => {
	beforeEach(() => {
		vi.mocked(apiClient.get)
			.mockReset()
			.mockReturnValue({ json: async () => folders } as never);
		vi.mocked(apiClient.post)
			.mockReset()
			.mockReturnValue({ json: async () => ({}) } as never);
	});

	test('http/https 형식이 아닌 주소를 입력하고 벗어나면 오류 문구를 보여주고 등록할 수 없다', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.click(await screen.findByText('개발'));
		await user.type(screen.getByRole('textbox', { name: /URL/ }), 'react.dev');
		await user.tab();

		expect(screen.getByText('http:// 또는 https://로 시작하는 주소를 입력해주세요')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '등록하기' })).toBeDisabled();
	});

	test('입력하는 중에는 오류 문구를 보여주지 않는다', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.type(await screen.findByRole('textbox', { name: /URL/ }), 'https://');

		expect(screen.queryByText('http:// 또는 https://로 시작하는 주소를 입력해주세요')).not.toBeInTheDocument();
	});

	test('올바른 주소와 폴더를 고르면 등록 API를 호출한다', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.click(await screen.findByText('개발'));
		await user.type(screen.getByRole('textbox', { name: /URL/ }), 'https://react.dev');
		await user.click(screen.getByRole('button', { name: '등록하기' }));

		expect(apiClient.post).toHaveBeenCalledWith('links', {
			json: { url: 'https://react.dev', folderId: 'f1', savedReason: undefined },
		});
	});

	test('저장 이유는 500자까지만 입력된다', async () => {
		const user = userEvent.setup();
		renderModal();

		const textarea = await screen.findByRole('textbox', { name: /저장 이유/ });
		await user.click(textarea);
		await user.paste('가'.repeat(510));

		expect(textarea).toHaveValue('가'.repeat(500));
	});
});
