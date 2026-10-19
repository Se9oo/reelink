import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

vi.mock('@/shared/api/client', () => ({
	apiClient: { post: vi.fn() },
}));

function renderModal() {
	const queryClient = new QueryClient();

	render(
		<QueryClientProvider client={queryClient}>
			<CreateFolderModal open onOpenChange={() => {}} parentFolderId={null} />
		</QueryClientProvider>,
	);
}

describe('CreateFolderModal', () => {
	test('폴더 이름은 50자까지만 입력된다', async () => {
		const user = userEvent.setup();
		renderModal();

		const input = screen.getByRole('textbox', { name: /폴더 이름/ });
		await user.click(input);
		await user.paste('가'.repeat(60));

		expect(input).toHaveValue('가'.repeat(50));
	});

	test('공백만 입력하면 만들 수 없다', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByRole('textbox', { name: /폴더 이름/ }), '   ');

		expect(screen.getByRole('button', { name: '만들기' })).toBeDisabled();
	});
});
