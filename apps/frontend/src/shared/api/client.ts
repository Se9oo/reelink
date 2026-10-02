import ky from 'ky';

import { API_URL } from '@/shared/config/env';

export const apiClient = ky.create({
	baseUrl: API_URL,
	credentials: 'include',
});
