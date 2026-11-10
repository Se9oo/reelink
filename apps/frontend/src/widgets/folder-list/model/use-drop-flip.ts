'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';

export const DROP_ANIMATION_DURATION = 150;

function measureRowTops(list: HTMLElement | null) {
	const tops = new Map<string, number>();

	list?.querySelectorAll<HTMLElement>('[data-folder-id]').forEach((row) => {
		tops.set(row.dataset.folderId!, row.offsetTop);
	});

	return tops;
}

/**
 * 드롭으로 순서가 바뀔 때 자리가 바뀐 형제 행을 이전 위치에서 새 위치로 미끄러지게 한다(FLIP).
 * 반환하는 capture를 새 순서 반영 직전에 호출하면 그때 위치를 재 두고, 다음 렌더에서 비교한다.
 * 드롭한 행 자체는 DragOverlay의 drop animation이 착지시키므로 제외한다. 스크롤에 영향받지
 * 않게 getBoundingClientRect 대신 offsetTop으로 잰다.
 */
export function useDropFlip(listRef: RefObject<HTMLElement | null>) {
	const pending = useRef<{ droppedId: string; tops: Map<string, number> } | null>(null);

	useLayoutEffect(() => {
		if (!pending.current) {
			return;
		}

		const { droppedId, tops: prevTops } = pending.current;
		pending.current = null;

		measureRowTops(listRef.current).forEach((top, id) => {
			const prevTop = prevTops.get(id);

			if (id !== droppedId && prevTop !== undefined && prevTop !== top) {
				listRef.current
					?.querySelector(`[data-folder-id="${id}"]`)
					?.animate([{ transform: `translateY(${prevTop - top}px)` }, { transform: 'none' }], {
						duration: DROP_ANIMATION_DURATION,
						easing: 'ease',
					});
			}
		});
	});

	return function capture(droppedId: string) {
		pending.current = { droppedId, tops: measureRowTops(listRef.current) };
	};
}
