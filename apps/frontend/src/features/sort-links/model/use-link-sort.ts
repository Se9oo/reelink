'use client';

import { useSyncExternalStore } from 'react';

import { LinkSort } from '@/entities/link/model/sort-links';

const STORAGE_KEY = 'link-sort';
const DEFAULT_SORT: LinkSort = 'newest';
const SORTS: LinkSort[] = ['newest', 'oldest', 'name'];
const listeners = new Set<() => void>();

function isLinkSort(value: string | null): value is LinkSort {
	return SORTS.includes(value as LinkSort);
}

function readSort(): LinkSort {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		return isLinkSort(stored) ? stored : DEFAULT_SORT;
	} catch {
		return DEFAULT_SORT;
	}
}

function subscribe(onStoreChange: () => void) {
	listeners.add(onStoreChange);
	return () => listeners.delete(onStoreChange);
}

export function useLinkSort() {
	const sort = useSyncExternalStore(subscribe, readSort, () => DEFAULT_SORT);

	function setSort(next: LinkSort) {
		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {}

		listeners.forEach((listener) => listener());
	}

	return { sort, setSort };
}
