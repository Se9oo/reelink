import { Link } from '@/entities/link/model/types';

export function patchLink<T>(data: T, updated: Link): T {
	function patch(value: unknown): unknown {
		if (Array.isArray(value)) {
			const next = value.map(patch);

			return next.some((item, index) => item !== value[index]) ? next : value;
		}

		if (value === null || typeof value !== 'object') {
			return value;
		}

		const record = value as Record<string, unknown>;

		if (record.id === updated.id && 'thumbnailUrl' in record) {
			const changed = Object.entries(updated).some(([key, field]) => record[key] !== field);

			return changed ? { ...record, ...updated } : record;
		}

		const entries = Object.entries(record).map(([key, child]) => [key, patch(child)] as const);

		return entries.some(([key, child]) => child !== record[key]) ? Object.fromEntries(entries) : record;
	}

	return patch(data) as T;
}
