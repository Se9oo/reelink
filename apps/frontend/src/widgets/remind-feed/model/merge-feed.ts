import { type Feed } from '@/entities/link/api/get-feed';
import { Link } from '@/entities/link/model/types';

function updateFrom(items: Link[], latestById: Map<string, Link>) {
	return items.map((item) => latestById.get(item.id) ?? item);
}

export function mergeFeed(local: Feed, server: Feed): Feed {
	const latestById = new Map([...server.unviewed, ...server.revisit].map((item) => [item.id, item]));
	const localIds = new Set(local.unviewed.map((item) => item.id));

	return {
		unviewed: [...updateFrom(local.unviewed, latestById), ...server.unviewed.filter((item) => !localIds.has(item.id))],
		revisit: updateFrom(local.revisit, latestById),
	};
}
