import { isLink } from '@/entities/link/model/is-link';
import { Link } from '@/entities/link/model/types';

export function patchLink<T>(data: T, updated: Link): T {
	function patch(value: unknown): unknown {
		if (isLink(value)) {
			const changed =
				value.id === updated.id && Object.entries(updated).some(([key, field]) => value[key as keyof Link] !== field);

			return changed ? { ...value, ...updated } : value;
		}

		if (typeof value !== 'object' || value === null) {
			return value;
		}

		if (Array.isArray(value)) {
			const next = value.map(patch);

			return next.some((item, index) => item !== value[index]) ? next : value;
		}

		const entries = Object.entries(value).map(([key, child]) => [key, patch(child)] as const);

		return entries.some(([key, child]) => child !== value[key as keyof typeof value])
			? Object.fromEntries(entries)
			: value;
	}

	return patch(data) as T;
}
