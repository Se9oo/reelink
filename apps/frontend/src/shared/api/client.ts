import ky from 'ky';

import { API_URL } from '@/shared/config/env';

export const apiClient = ky.create({
	baseUrl: API_URL,
	credentials: 'include',
	hooks: {
		afterResponse: [
			async ({ request, options, response }) => {
				if (response.status !== 401 || request.headers.has('x-retried')) {
					return;
				}

				const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });

				if (!refreshed.ok) {
					return;
				}

				const retryHeaders = new Headers(request.headers);
				retryHeaders.set('x-retried', 'true');

				return ky(request, { ...options, headers: retryHeaders });
			},
		],
	},
});
