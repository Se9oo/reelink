import { Link } from '@/entities/link/model/types';

export type LinkSort = 'newest' | 'oldest' | 'name';

function displayName(link: Link) {
	return link.title ?? new URL(link.url).hostname;
}

const compareBySort: Record<LinkSort, (a: Link, b: Link) => number> = {
	newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
	oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
	name: (a, b) => displayName(a).localeCompare(displayName(b), 'ko'),
};

export function sortLinks(links: Link[], sort: LinkSort): Link[] {
	const pinned = links
		.filter((link) => link.pinnedAt !== null)
		.toSorted((a, b) => (b.pinnedAt ?? '').localeCompare(a.pinnedAt ?? ''));
	const rest = links.filter((link) => link.pinnedAt === null).toSorted(compareBySort[sort]);

	return [...pinned, ...rest];
}
