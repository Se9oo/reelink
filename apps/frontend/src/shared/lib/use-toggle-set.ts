'use client';

import { useState, useSyncExternalStore } from 'react';

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

const EMPTY_SET = new Set<string>();
const listenersByKey = new Map<string, Set<() => void>>();
const idsByKey = new Map<string, Set<string>>();

function readFromStorage(storageKey: string): Set<string> {
	try {
		const raw = window.localStorage.getItem(storageKey);
		return raw ? new Set(JSON.parse(raw)) : new Set();
	} catch {
		return new Set();
	}
}

function getSnapshot(storageKey: string): Set<string> {
	if (!idsByKey.has(storageKey)) {
		idsByKey.set(storageKey, readFromStorage(storageKey));
	}

	return idsByKey.get(storageKey) as Set<string>;
}

function subscribe(storageKey: string) {
	return (onStoreChange: () => void) => {
		if (!listenersByKey.has(storageKey)) {
			listenersByKey.set(storageKey, new Set());
		}

		listenersByKey.get(storageKey)?.add(onStoreChange);

		return () => listenersByKey.get(storageKey)?.delete(onStoreChange);
	};
}

function setIdsForKey(storageKey: string, ids: Set<string>) {
	idsByKey.set(storageKey, ids);

	try {
		window.localStorage.setItem(storageKey, JSON.stringify([...ids]));
	} catch {}

	listenersByKey.get(storageKey)?.forEach((listener) => listener());
}

export function usePersistedToggleSet(storageKey: string) {
	const ids = useSyncExternalStore(
		subscribe(storageKey),
		() => getSnapshot(storageKey),
		() => EMPTY_SET,
	);

	const toggle = (id: string) => {
		const next = new Set(ids);

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}

		setIdsForKey(storageKey, next);
	};

	const add = (id: string) => {
		setIdsForKey(storageKey, new Set(ids).add(id));
	};

	return { ids, toggle, add };
}
