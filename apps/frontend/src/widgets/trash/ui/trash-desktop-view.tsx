'use client';

import { IconMagnifyingglassLine } from '@karrotmarket/react-monochrome-icon';

import { getDaysUntilPurge } from '@/entities/trash/model/trash-view';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';
import { TrashFolderRow } from '@/entities/trash/ui/trash-folder-row';
import { TrashLinkRow } from '@/entities/trash/ui/trash-link-row';

interface TrashDesktopViewProps {
	folders: TrashFolder[];
	links: TrashLink[];
	onRestoreFolder: (id: string) => void;
	onRestoreLink: (id: string) => void;
	onDeleteFolder: (folder: TrashFolder) => void;
	onDeleteLink: (link: TrashLink) => void;
}

export function TrashDesktopView({
	folders,
	links,
	onRestoreFolder,
	onRestoreLink,
	onDeleteFolder,
	onDeleteLink,
}: TrashDesktopViewProps) {
	return (
		<div className="hidden flex-col px-8 pt-6 pb-8 lg:flex">
			<h1 className="pb-4 text-xl font-bold text-[var(--seed-color-fg-neutral)]">휴지통</h1>

			<div
				className="mb-4 flex h-9 max-w-[360px] items-center gap-2 rounded-lg border
					border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] px-3"
			>
				<IconMagnifyingglassLine size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
				<span className="text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">이름으로 검색</span>
			</div>

			<div className="grid grid-cols-2 gap-6">
				<section className="flex min-w-0 flex-col">
					<h2 className="px-0.5 pb-2.5 text-[12.5px] font-semibold text-[var(--seed-color-fg-neutral-muted)]">폴더</h2>
					<div className="flex flex-col gap-2">
						{folders.length === 0 ? (
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
						)}
					</div>
				</section>

				<section className="flex min-w-0 flex-col">
					<h2 className="px-0.5 pb-2.5 text-[12.5px] font-semibold text-[var(--seed-color-fg-neutral-muted)]">링크</h2>
					<div className="flex flex-col gap-2">
						{links.length === 0 ? (
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
				</section>
			</div>
		</div>
	);
}
