'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import {
	IconArrowClockwiseCircularLine,
	IconCheckmarkLine,
	IconChevronDownLine,
	IconChevronUpLine,
} from '@karrotmarket/react-monochrome-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';
import { ActionButton } from 'seed-design/ui/action-button';

import { mergeFeed } from '@/widgets/remind-feed/model/merge-feed';
import { FeedActions } from '@/widgets/remind-feed/ui/feed-actions';
import { FeedCard } from '@/widgets/remind-feed/ui/feed-card';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';
import { RegisterLinkModal } from '@/features/register-link/ui/register-link-modal';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { type Feed, feedKeys, feedQueryOptions } from '@/entities/link/api/get-feed';
import { useViewLink } from '@/entities/link/api/view-link';
import { Link } from '@/entities/link/model/types';

import { folderDetailPath } from '@/shared/config/routes';

type Section = 'unviewed' | 'revisit';
type Entry = { type: 'link'; link: Link; section: Section } | { type: 'divider' } | { type: 'end' };

export function RemindFeed() {
	const { data } = useQuery(feedQueryOptions());
	const { data: folders = [] } = useQuery(foldersQueryOptions());
	const queryClient = useQueryClient();
	const viewLink = useViewLink();
	const { onDelete, onCopy, onEdit, onMove } = useLinkActions();
	const router = useRouter();
	const listRef = useRef<HTMLDivElement>(null);

	const [source, setSource] = useState<Feed | null>(null);
	const [lists, setLists] = useState<Record<Section, Link[]>>({ unviewed: [], revisit: [] });
	const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

	if (data && data !== source) {
		setLists(source ? mergeFeed(lists, data) : data);
		setSource(data);
	}

	if (!source) {
		return null;
	}

	const entries: Entry[] = [
		...lists.unviewed.map((link) => ({ type: 'link' as const, link, section: 'unviewed' as const })),
		...(lists.revisit.length > 0 ? [{ type: 'divider' as const }] : []),
		...lists.revisit.map((link) => ({ type: 'link' as const, link, section: 'revisit' as const })),
	];

	if (entries.length > 0) {
		entries.push({ type: 'end' });
	}

	function openRegisterModal() {
		overlay.open(({ isOpen, close }) => (
			<RegisterLinkModal
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				onRegistered={() => {
					close();
					queryClient.invalidateQueries({ queryKey: feedKeys.all });
				}}
			/>
		));
	}

	const registerButton = (
		<ActionButton variant="brandSolid" size="medium" onClick={openRegisterModal} className="mt-3">
			링크 등록하기
		</ActionButton>
	);

	if (entries.length === 0) {
		return (
			<FeedMessage
				icon={<IconArrowClockwiseCircularLine size={36} />}
				title="지금은 다시 볼 링크가 없어요"
				description="나중에 볼 링크를 저장하면, 잊기 전에 여기서 다시 보여드릴게요"
				className="h-full"
			>
				{registerButton}
			</FeedMessage>
		);
	}

	function open(link: Link, section: Section) {
		if (section === 'revisit') {
			return;
		}

		setViewedIds((prev) => new Set(prev).add(link.id));
		viewLink.mutate(link.id);
	}

	function restoreAt(link: Link, section: Section, index: number) {
		setLists((prev) => {
			if (prev[section].some((item) => item.id === link.id)) {
				return prev;
			}

			const next = [...prev[section]];
			next.splice(Math.min(index, next.length), 0, link);

			return { ...prev, [section]: next };
		});
	}

	function replace(updated: Link) {
		setLists((prev) => ({
			unviewed: prev.unviewed.map((item) => (item.id === updated.id ? updated : item)),
			revisit: prev.revisit.map((item) => (item.id === updated.id ? updated : item)),
		}));
	}

	function remove(link: Link, section: Section) {
		const index = lists[section].findIndex((item) => item.id === link.id);

		setLists((prev) => ({ ...prev, [section]: prev[section].filter((item) => item.id !== link.id) }));
		onDelete(link, {
			onFailed: () => restoreAt(link, section, index),
			onRestored: () => restoreAt(link, section, index),
		});
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
		if (event.key !== 'Delete' && event.key !== 'Backspace') {
			return;
		}

		const current = entries[currentIndex()];

		if (current?.type === 'link') {
			event.preventDefault();
			remove(current.link, current.section);
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
				{entries.map((entry, index) =>
					entry.type === 'divider' ? (
						<FeedMessage
							key="divider"
							icon={<IconArrowClockwiseCircularLine size={36} />}
							title="안 본 링크를 다 봤어요!"
							description="이제 예전에 본 링크를 다시 꺼내볼게요"
							className="h-full snap-start snap-always"
						/>
					) : entry.type === 'end' ? (
						<FeedMessage
							key="end"
							icon={<IconCheckmarkLine size={36} />}
							title="오늘은 여기까지!"
							description="새 링크가 오면 다시 보여드릴게요"
							className="h-full snap-start snap-always"
						>
							{registerButton}
						</FeedMessage>
					) : (
						<section
							key={entry.link.id}
							className="relative flex h-full snap-start snap-always items-center justify-center gap-3.5 p-2.5 lg:p-4"
						>
							<div className="relative h-full w-full max-w-[420px] lg:w-[520px] lg:max-w-none">
								<FeedCard
									link={entry.link}
									position={entry.section === 'unviewed' ? index + 1 : undefined}
									total={lists.unviewed.length}
									folderPath={buildFolderPath(folders, entry.link.folderId)}
									viewed={viewedIds.has(entry.link.id)}
									revisit={entry.section === 'revisit'}
									onOpen={() => open(entry.link, entry.section)}
								/>
								<FeedActions
									url={entry.link.url}
									onOpen={() => open(entry.link, entry.section)}
									onCopy={() => onCopy(entry.link)}
									onDelete={() => remove(entry.link, entry.section)}
									onEdit={() => onEdit(entry.link, { onUpdated: replace })}
									onMove={() => onMove(entry.link, { onUpdated: replace })}
									onGoToFolder={() => router.push(folderDetailPath(entry.link.folderId))}
								/>
							</div>
						</section>
					),
				)}
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

interface FeedMessageProps {
	icon: ReactNode;
	title: string;
	description: string;
	className?: string;
	children?: ReactNode;
}

function FeedMessage({ icon, title, description, className = '', children }: FeedMessageProps) {
	return (
		<section className={`flex flex-col items-center justify-center gap-2.5 p-6 text-center ${className}`}>
			<div
				className="mb-1 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[var(--seed-color-bg-brand-weak)]
					text-[var(--seed-color-fg-brand)]"
			>
				{icon}
			</div>
			<p className="text-[17px] font-bold text-[var(--seed-color-fg-neutral)]">{title}</p>
			<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">{description}</p>
			{children}
		</section>
	);
}
