'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { IconChevronLeftLine, IconMagnifyingglassLine } from '@karrotmarket/react-monochrome-icon';

import { getDaysUntilPurge } from '@/entities/trash/model/trash-view';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';
import { TrashFolderRow } from '@/entities/trash/ui/trash-folder-row';
import { TrashLinkRow } from '@/entities/trash/ui/trash-link-row';

interface TrashMobileViewProps {
	folders: TrashFolder[];
	links: TrashLink[];
	onRestoreFolder: (id: string) => void;
	onRestoreLink: (id: string) => void;
	onDeleteFolder: (folder: TrashFolder) => void;
	onDeleteLink: (link: TrashLink) => void;
}

const TABS = [
	{ value: 'folders', label: '폴더' },
	{ value: 'links', label: '링크' },
] as const;

export function TrashMobileView({
	folders,
	links,
	onRestoreFolder,
	onRestoreLink,
	onDeleteFolder,
	onDeleteLink,
}: TrashMobileViewProps) {
	const router = useRouter();
	const [tab, setTab] = useState<'folders' | 'links'>('folders');

	return (
		<div className="flex flex-col lg:hidden">
			<div
				className="flex flex-col gap-3 border-b border-[var(--seed-color-stroke-neutral-subtle)]
					bg-[var(--seed-color-bg-layer-default)] px-4 pt-1 pb-3"
			>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => router.back()}
						aria-label="뒤로 가기"
						className="-ml-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
					>
						<IconChevronLeftLine size={20} />
					</button>
					<h1 className="text-[17px] font-semibold text-[var(--seed-color-fg-neutral)]">휴지통</h1>
				</div>
				<div className="flex gap-1">
					{TABS.map(({ value, label }) => (
						<button
							key={value}
							type="button"
							onClick={() => setTab(value)}
							className={`h-9 flex-1 cursor-pointer rounded-lg text-[13.5px] font-semibold ${
								tab === value
									? 'bg-[var(--seed-color-bg-brand-solid)] text-white'
									: 'text-[var(--seed-color-fg-neutral-muted)]'
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			<div className="px-4 pt-3 pb-1">
				<div
					className="flex h-9 items-center gap-2 rounded-lg border border-[var(--seed-color-stroke-neutral-subtle)]
						bg-[var(--seed-color-bg-layer-default)] px-3"
				>
					<IconMagnifyingglassLine size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
					<span className="text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">이름으로 검색</span>
				</div>
			</div>

			<div className="flex flex-col gap-2 px-4 pt-2 pb-8">
				{tab === 'folders' ? (
					folders.length === 0 ? (
						<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">삭제된 폴더가 없어요</p>
					) : (
						folders.map((folder) => (
							<TrashFolderRow
								key={folder.id}
								folder={folder}
								daysLeft={getDaysUntilPurge(folder.deletedAt ?? new Date().toISOString())}
								subfolders={folders}
								links={links}
								onRestore={() => onRestoreFolder(folder.id)}
								onDelete={() => onDeleteFolder(folder)}
							/>
						))
					)
				) : links.length === 0 ? (
					<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">삭제된 링크가 없어요</p>
				) : (
					links.map((link) => (
						<TrashLinkRow
							key={link.id}
							link={link}
							daysLeft={getDaysUntilPurge(link.deletedAt ?? new Date().toISOString())}
							onRestore={() => onRestoreLink(link.id)}
							onDelete={() => onDeleteLink(link)}
						/>
					))
				)}
			</div>
		</div>
	);
}
