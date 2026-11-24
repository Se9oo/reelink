import { isLink } from '@/entities/link/model/is-link';

export const MAX_WAIT_MS = 60 * 60 * 1000;

export interface Reminder {
	id: string;
	remindAt: string;
}

export function collectReminders(data: unknown): Reminder[] {
	if (isLink(data)) {
		return data.remindAt ? [{ id: data.id, remindAt: data.remindAt }] : [];
	}

	if (typeof data !== 'object' || data === null) {
		return [];
	}

	return Object.values(data).flatMap(collectReminders);
}

export function splitReminders(reminders: Reminder[], now: Date) {
	const expiredIds = [
		...new Set(reminders.filter(({ remindAt }) => Date.parse(remindAt) <= now.getTime()).map(({ id }) => id)),
	];
	const upcoming = reminders.map(({ remindAt }) => Date.parse(remindAt) - now.getTime()).filter((delay) => delay > 0);
	const nextDelayMs = upcoming.length > 0 ? Math.min(...upcoming, MAX_WAIT_MS) : null;

	return { expiredIds, nextDelayMs };
}
