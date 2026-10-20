import { Link } from '@/entities/link/model/types';

const OG_WAIT_MS = 15 * 1000;

export function hasPendingOgTags(links: Link[] | undefined, now: Date = new Date()): boolean {
	return (links ?? []).some(
		(link) =>
			link.title === null &&
			link.thumbnailUrl === null &&
			now.getTime() - new Date(link.createdAt).getTime() < OG_WAIT_MS,
	);
}
