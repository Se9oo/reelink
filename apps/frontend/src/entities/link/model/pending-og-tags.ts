import { isLink } from '@/entities/link/model/is-link';
import { Link } from '@/entities/link/model/types';

export const OG_WAIT_MS = 15_000;
export const MAX_PENDING_IDS = 20;

export interface LinkWithoutOgTags {
	id: string;
	createdAt: string;
}

function lacksOgTags(link: Pick<Link, 'title' | 'thumbnailUrl' | 'deletedAt'>) {
	return link.title === null && link.thumbnailUrl === null && !link.deletedAt;
}

function remainingWait(createdAt: string, now: Date) {
	return Math.max(0, OG_WAIT_MS - (now.getTime() - Date.parse(createdAt)));
}

export function collectLinksWithoutOgTags(data: unknown): LinkWithoutOgTags[] {
	if (isLink(data)) {
		return lacksOgTags(data) ? [{ id: data.id, createdAt: data.createdAt }] : [];
	}

	if (typeof data !== 'object' || data === null) {
		return [];
	}

	return Object.values(data).flatMap(collectLinksWithoutOgTags);
}

export function selectPendingIds(entries: LinkWithoutOgTags[], now: Date): string[] {
	const waiting = entries.filter(({ createdAt }) => remainingWait(createdAt, now) > 0);

	return [...new Set(waiting.map(({ id }) => id))].sort().slice(0, MAX_PENDING_IDS);
}

export function ogWaitRemainingMs(
	link: Pick<Link, 'title' | 'thumbnailUrl' | 'createdAt' | 'deletedAt'>,
	now: Date,
): number {
	return lacksOgTags(link) ? remainingWait(link.createdAt, now) : 0;
}
