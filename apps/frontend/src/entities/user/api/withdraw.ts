import { useRouter } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ROUTES } from '@/shared/config/routes';

function withdraw() {
	return apiClient.delete('auth/me');
}

export function useWithdraw() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: withdraw,
		onSuccess: () => {
			queryClient.clear();
			router.push(ROUTES.LOGIN);
		},
	});
}
