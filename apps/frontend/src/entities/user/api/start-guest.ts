import { useRouter } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ROUTES } from '@/shared/config/routes';

function startGuest() {
	return apiClient.post('auth/guest');
}

export function useStartGuest() {
	const router = useRouter();

	return useMutation({
		mutationFn: startGuest,
		onSuccess: () => {
			router.push(ROUTES.HOME);
		},
	});
}
