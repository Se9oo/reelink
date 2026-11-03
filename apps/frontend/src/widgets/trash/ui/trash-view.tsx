'use client';

import { type ReactNode, useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { IconChevronLeftLine } from '@karrotmarket/react-monochrome-icon';

import { buildTrashItems, isUrgent, RETENTION_DAYS, TrashItem } from '@/entities/trash/model/trash-view';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';
import { TrashItemRow } from '@/entities/trash/ui/trash-item-row';

interface TrashViewProps {
	folders: TrashFolder[];
	links: TrashLink[];
	onRestoreFolder: (id: string) => void;
	onRestoreLink: (id: string) => void;
	onDeleteFolder: (folder: TrashFolder) => void;
	onDeleteLink: (link: TrashLink) => void;
}

type Filter = 'all' | 'folder' | 'link';

const EMPTY_MESSAGES: Record<Filter, string> = {
	all: '휴지통이 비어 있어요',
	folder: '삭제된 폴더가 없어요',
	link: '삭제된 링크가 없어요',
};

export function TrashView({
	folders,
	links,
	onRestoreFolder,
	onRestoreLink,
	onDeleteFolder,
	onDeleteLink,
}: TrashViewProps) {
	const router = useRouter();
	const [filter, setFilter] = useState<Filter>('all');

	const items = buildTrashItems(folders, links).filter((item) => filter === 'all' || item.kind === filter);
	const urgentItems = items.filter((item) => isUrgent(item.daysLeft));
	const restItems = items.filter((item) => !isUrgent(item.daysLeft));

	const chips = [
		{ value: 'all', label: '전체', count: folders.length + links.length },
		{ value: 'folder', label: '폴더', count: folders.length },
		{ value: 'link', label: '링크', count: links.length },
	] as const;

	const renderList = (list: TrashItem[]) => (
		<ul className="flex flex-col lg:divide-y lg:divide-[var(--seed-color-stroke-neutral-subtle)]">
			{list.map((item) => (
				<TrashItemRow
					key={item.id}
					item={item}
					onRestore={() => (item.kind === 'folder' ? onRestoreFolder(item.id) : onRestoreLink(item.id))}
					onDelete={() => (item.kind === 'folder' ? onDeleteFolder(item.folder) : onDeleteLink(item.link))}
				/>
			))}
		</ul>
	);

	return (
		<div className="flex h-full flex-col lg:mx-auto lg:h-auto lg:w-full lg:max-w-[960px] lg:px-10 lg:pt-7 lg:pb-16">
			<div
				className="shrink-0 border-b border-[var(--seed-color-stroke-neutral-subtle)] lg:flex lg:items-end
					lg:justify-between lg:border-0 lg:pb-4"
			>
				<div>
					<div className="flex items-center gap-1 pt-3 pr-3 pl-2 lg:p-0">
						<button
							type="button"
							onClick={() => router.back()}
							aria-label="뒤로 가기"
							className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg
								text-[var(--seed-color-fg-neutral)] lg:hidden"
						>
							<IconChevronLeftLine size={22} />
						</button>
						<h1 className="text-[17px] font-bold text-[var(--seed-color-fg-neutral)] lg:text-2xl">휴지통</h1>
					</div>
					<p
						className="px-[18px] text-[12.5px] text-[var(--seed-color-fg-neutral-muted)] lg:px-0 lg:pt-1 lg:text-[13px]"
					>
						휴지통에 있는 항목은 {RETENTION_DAYS}일이 지나면 자동으로 영구 삭제돼요
					</p>
				</div>

				<div className="flex gap-1.5 px-4 pt-3 pb-2 lg:p-0">
					{chips.map(({ value, label, count }) => (
						<button
							key={value}
							type="button"
							aria-pressed={filter === value}
							onClick={() => setFilter(value)}
							className={`flex h-8 cursor-pointer items-center gap-1 rounded-full border px-3 text-[13px] font-semibold
							${
								filter === value
									? `border-[var(--seed-color-fg-neutral)] bg-[var(--seed-color-fg-neutral)]
										text-[var(--seed-color-bg-layer-default)]`
									: `border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)]
										text-[var(--seed-color-fg-neutral-muted)]`
							}`}
						>
							{label} <span className="font-medium opacity-75">{count}</span>
						</button>
					))}
				</div>
			</div>

			<div
				className="min-h-0 flex-1 overflow-y-auto pt-1 pb-24 lg:divide-y
					lg:divide-[var(--seed-color-stroke-neutral-subtle)] lg:overflow-hidden lg:rounded-2xl lg:border
					lg:border-[var(--seed-color-stroke-neutral-subtle)] lg:bg-[var(--seed-color-bg-layer-default)] lg:p-0"
			>
				{items.length === 0 ? (
					<p className="p-10 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">{EMPTY_MESSAGES[filter]}</p>
				) : urgentItems.length === 0 ? (
					renderList(restItems)
				) : (
					<>
						<TrashGroup label="곧 사라져요" count={urgentItems.length} urgent>
							{renderList(urgentItems)}
						</TrashGroup>
						{restItems.length > 0 && (
							<>
								<div className="my-2 h-2 bg-[var(--app-bg-canvas)] lg:hidden" />
								<TrashGroup label="나머지" count={restItems.length}>
									{renderList(restItems)}
								</TrashGroup>
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}

interface TrashGroupProps {
	label: string;
	count: number;
	urgent?: boolean;
	children: ReactNode;
}

function TrashGroup({ label, count, urgent = false, children }: TrashGroupProps) {
	const labelId = useId();

	return (
		<section aria-labelledby={labelId} className="flex flex-col">
			<h2
				className={`flex items-center gap-1.5 px-[18px] pt-3 pb-1.5 text-[12.5px] font-bold lg:border-b
					lg:border-[var(--seed-color-stroke-neutral-subtle)] lg:bg-[var(--app-bg-canvas)] lg:py-2.5
					${urgent ? 'text-[var(--seed-color-fg-critical)]' : 'text-[var(--seed-color-fg-neutral-muted)]'}`}
			>
				{urgent && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
				<span id={labelId}>{label}</span>
				<span aria-hidden="true">· {count}</span>
			</h2>
			{children}
		</section>
	);
}
