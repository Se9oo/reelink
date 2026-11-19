export function patchLinkThumbnail<T>(data: T, linkId: string, thumbnailUrl: string | null): T {
	function patch(value: unknown): unknown {
		if (Array.isArray(value)) {
			const next = value.map(patch);

			return next.some((item, index) => item !== value[index]) ? next : value;
		}

		if (value === null || typeof value !== 'object') {
			return value;
		}

		const record = value as Record<string, unknown>;

		if (record.id === linkId && 'thumbnailUrl' in record) {
			return record.thumbnailUrl === thumbnailUrl ? record : { ...record, thumbnailUrl };
		}

		const entries = Object.entries(record).map(([key, child]) => [key, patch(child)] as const);

		return entries.some(([key, child]) => child !== record[key]) ? Object.fromEntries(entries) : record;
	}

	return patch(data) as T;
}
