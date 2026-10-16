import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PermanentDeleteDialog } from '@/entities/trash/ui/permanent-delete-dialog';

import { apiClient } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
	apiClient: { delete: vi.fn() },
}));

function renderDialog(props: Partial<Parameters<typeof PermanentDeleteDialog>[0]> = {}) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const onOpenChange = vi.fn();

	render(
		<QueryClientProvider client={queryClient}>
			<PermanentDeleteDialog open onOpenChange={onOpenChange} type="folder" id="f1" name="레시피" {...props} />
		</QueryClientProvider>,
	);

	return { onOpenChange };
}

describe('PermanentDeleteDialog', () => {
	beforeEach(() => {
		vi.mocked(apiClient.delete).mockReset();
	});

	test('폴더면 이름과 하위 항목까지 삭제된다는 안내를 보여준다', () => {
		renderDialog();

		expect(screen.getByText('"레시피" 폴더를 영구 삭제할까요?')).toBeInTheDocument();
		expect(screen.getByText(/하위 폴더와 링크까지 모두 삭제/)).toBeInTheDocument();
	});

	test('영구 삭제를 누르면 해당 항목의 삭제 API를 호출하고 다이얼로그를 닫는다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.delete).mockResolvedValue(new Response(null, { status: 204 }) as never);
		const { onOpenChange } = renderDialog({ type: 'link', id: 'l1', name: '네이버 기사' });

		await user.click(screen.getByRole('button', { name: '영구 삭제' }));

		expect(apiClient.delete).toHaveBeenCalledWith('trash/link/l1');
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	test('삭제에 실패하면 에러 문구를 보여주고 닫지 않는다', async () => {
		const user = userEvent.setup();
		vi.mocked(apiClient.delete).mockRejectedValue(new Error('fail'));
		const { onOpenChange } = renderDialog();

		await user.click(screen.getByRole('button', { name: '영구 삭제' }));

		expect(await screen.findByText('삭제하지 못했어요. 다시 시도해주세요.')).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});
});
