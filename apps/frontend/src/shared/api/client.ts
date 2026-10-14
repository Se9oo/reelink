import ky from 'ky';

import { API_URL } from '@/shared/config/env';
import { ROUTES } from '@/shared/config/routes';

function redirectToLogin() {
	if (window.location.pathname !== ROUTES.LOGIN) {
		window.location.href = ROUTES.LOGIN;
	}
}

// refresh token이 rotation 방식이라 동시에 여러 요청이 401을 맞으면 하나만 성공하고 나머지는 이미 소모된
// refresh token으로 401을 받는다 — 진행 중인 refresh를 공유해서 실제 호출이 한 번만 나가게 한다.
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken() {
	refreshPromise ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
		.then((response) => response.ok)
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

export const apiClient = ky.create({
	baseUrl: API_URL,
	credentials: 'include',
	hooks: {
		afterResponse: [
			async ({ request, options, response }) => {
				if (response.status !== 401 || request.headers.has('x-retried')) {
					return;
				}

				const refreshed = await refreshAccessToken();

				if (!refreshed) {
					redirectToLogin();
					return;
				}

				const retryHeaders = new Headers(request.headers);
				retryHeaders.set('x-retried', 'true');

				const retried = await ky(request, { ...options, headers: retryHeaders });

				if (retried.status === 401) {
					redirectToLogin();
				}

				return retried;
			},
		],
	},
});
