import { isLink } from '@/entities/link/model/is-link';

export const OG_WAIT_MS = 15_000;
export const MAX_PENDING_IDS = 20;

export interface LinkWithoutOgTags {
	id: string;
	createdAt: string;
}

export function collectLinksWithoutOgTags(data: unknown): LinkWithoutOgTags[] {
	if (isLink(data)) {
		return data.title === null && data.thumbnailUrl === null ? [{ id: data.id, createdAt: data.createdAt }] : [];
	}

	if (typeof data !== 'object' || data === null) {
		return [];
	}

	return Object.values(data).flatMap(collectLinksWithoutOgTags);
}

export function selectPendingIds(entries: LinkWithoutOgTags[], now: Date): string[] {
	const waiting = entries.filter(({ createdAt }) => now.getTime() - Date.parse(createdAt) < OG_WAIT_MS);

	return [...new Set(waiting.map(({ id }) => id))].sort().slice(0, MAX_PENDING_IDS);
}
