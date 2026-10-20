'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import {
	IconArrowUpRightLine,
	IconCheckmarkLine,
	IconChevronDownLine,
	IconChevronUpLine,
	IconTrashcanLine,
} from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import { FeedCard } from '@/widgets/remind-feed/ui/feed-card';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { feedQueryOptions } from '@/entities/link/api/get-feed';
import { useViewLink } from '@/entities/link/api/view-link';
import { Link } from '@/entities/link/model/types';

export function RemindFeed() {
	const { data } = useQuery(feedQueryOptions());
	const { data: folders = [] } = useQuery(foldersQueryOptions());
	const viewLink = useViewLink();
	const { onDelete } = useLinkActions();
	const listRef = useRef<HTMLDivElement>(null);

	const [items, setItems] = useState<Link[] | null>(null);
	const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

	if (items === null && data) {
		setItems(data);
	}

	if (!items) {
		return null;
	}

	if (items.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2.5 p-6 text-center">
				<div
					className="mb-1 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[var(--seed-color-bg-brand-weak)]
						text-[var(--seed-color-fg-brand)]"
				>
					<IconCheckmarkLine size={36} />
				</div>
				<p className="text-[17px] font-bold text-[var(--seed-color-fg-neutral)]">정리 끝!</p>
				<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">새 링크가 오면 다시 보여드릴게요</p>
			</div>
		);
	}

	function open(link: Link) {
		setViewedIds((prev) => new Set(prev).add(link.id));
		viewLink.mutate(link.id);
	}

	function restoreAt(link: Link, index: number) {
		setItems((prev) => {
			if (!prev || prev.some((item) => item.id === link.id)) {
				return prev;
			}

			const next = [...prev];
			next.splice(Math.min(index, next.length), 0, link);

			return next;
		});
	}

	function remove(link: Link) {
		const index = items?.findIndex((item) => item.id === link.id) ?? -1;

		setItems((prev) => prev?.filter((item) => item.id !== link.id) ?? prev);
		onDelete(link, { onFailed: () => restoreAt(link, index), onRestored: () => restoreAt(link, index) });
	}

	function currentIndex() {
		const list = listRef.current;

		return list && list.clientHeight > 0 ? Math.round(list.scrollTop / list.clientHeight) : 0;
	}

	function move(step: number) {
		const list = listRef.current;

		list?.scrollBy({ top: step * list.clientHeight, behavior: 'smooth' });
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Delete' || event.key === 'Backspace') {
			const current = items?.[currentIndex()];

			if (current) {
				event.preventDefault();
				remove(current);
			}
		}
	}

	return (
		<div className="relative h-full bg-[var(--app-bg-feed)]">
			<div
				ref={listRef}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				aria-label="리마인드"
				className="h-full snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-contain outline-none
					[&::-webkit-scrollbar]:hidden"
			>
				{items.map((link, index) => (
					<section
						key={link.id}
						className="flex h-full snap-start snap-always items-center justify-center gap-3.5 p-2.5 lg:p-4"
					>
						<div className="h-full w-full max-w-[420px] lg:w-[520px] lg:max-w-none">
							<FeedCard
								link={link}
								position={index + 1}
								total={items.length}
								folderPath={buildFolderPath(folders, link.folderId)}
								viewed={viewedIds.has(link.id)}
								onOpen={() => open(link)}
							/>
						</div>
						<div className="hidden flex-col gap-3.5 self-end pb-3 lg:flex">
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => open(link)}
								className="flex flex-col items-center gap-1.5 text-xs font-semibold text-[var(--seed-color-fg-neutral)]"
							>
								<span
									className="flex h-12 w-12 items-center justify-center rounded-full
										bg-[var(--seed-color-bg-brand-solid)] text-[var(--seed-color-palette-static-white)]"
								>
									<IconArrowUpRightLine size={20} />
								</span>
								열기
							</a>
							<button
								type="button"
								onClick={() => remove(link)}
								className="flex cursor-pointer flex-col items-center gap-1.5 text-xs font-semibold
									text-[var(--seed-color-fg-neutral)]"
							>
								<span
									className="flex h-12 w-12 items-center justify-center rounded-full
										bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-critical)]
										hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]"
								>
									<IconTrashcanLine size={20} />
								</span>
								삭제
							</button>
						</div>
					</section>
				))}
			</div>

			<div className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-2.5 xl:flex">
				<button
					type="button"
					onClick={() => move(-1)}
					aria-label="이전 링크"
					className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral)]
						hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]"
				>
					<IconChevronUpLine size={20} />
				</button>
				<button
					type="button"
					onClick={() => move(1)}
					aria-label="다음 링크"
					className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral)]
						hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]"
				>
					<IconChevronDownLine size={20} />
				</button>
			</div>
		</div>
	);
}
