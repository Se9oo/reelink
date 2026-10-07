'use client';

import { useState } from 'react';

export function useToggleSet() {
	const [ids, setIds] = useState<Set<string>>(new Set());

	const toggle = (id: string) => {
		setIds((prev) => {
			const next = new Set(prev);

			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}

			return next;
		});
	};

	const add = (id: string) => {
		setIds((prev) => new Set(prev).add(id));
	};

	return { ids, toggle, add };
}
