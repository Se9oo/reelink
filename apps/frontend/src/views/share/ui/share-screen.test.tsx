import { StrictMode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ShareScreen } from '@/views/share/ui/share-screen';

import { apiClient } from '@/shared/api/client';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace }),
}));

vi.mock('@/shared/api/client', () => ({
	apiClient: { get: vi.fn(), post: vi.fn() },
}));

function renderScreen(sharedUrl: string | null) {
	render(
		<StrictMode>
			<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
				<OverlayProvider>
					<ShareScreen sharedUrl={sharedUrl} />
				</OverlayProvider>
			</QueryClientProvider>
		</StrictMode>,
	);
}

describe('ShareScreen', () => {
	beforeEach(() => {
		replace.mockReset();
		vi.mocked(apiClient.get).mockReturnValue({ json: async () => [] } as never);
	});

	test('홈으로 바꾸고 공유받은 주소로 등록 모달을 연다', async () => {
		renderScreen('https://youtu.be/abc');

		expect(await screen.findByRole('textbox', { name: /URL/ })).toHaveValue('https://youtu.be/abc');
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		expect(replace).toHaveBeenCalledWith('/home');
	});

	test('주소를 못 뽑았으면 빈 등록 모달을 연다', async () => {
		renderScreen(null);

		expect(await screen.findByRole('textbox', { name: /URL/ })).toHaveValue('');
	});
});
