import { HTTPError } from 'ky';

const MAX_RETRIES = 3;

export function shouldRetry(failureCount: number, error: Error): boolean {
	if (error instanceof HTTPError && error.response.status === 404) {
		return false;
	}

	return failureCount < MAX_RETRIES;
}
