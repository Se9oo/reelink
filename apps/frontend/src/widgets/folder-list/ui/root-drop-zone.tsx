'use client';

import { useDroppable } from '@dnd-kit/core';

import { ROOT_DROP_ZONE_ID } from '@/widgets/folder-list/model/flatten-tree';

/** 리스트 맨 아래 빈 공간 — 여기에 드롭하면 최상위 폴더 맨 뒤로 이동한다. */
export function RootDropZone() {
	const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ZONE_ID });

	return (
		<div
			ref={setNodeRef}
			className={`h-6 rounded-lg border-2 border-dashed transition-colors ${
				isOver
					? 'border-[var(--seed-color-stroke-brand-solid)] bg-[var(--seed-color-bg-brand-weak)]'
					: 'border-transparent'
				}`}
		/>
	);
}
