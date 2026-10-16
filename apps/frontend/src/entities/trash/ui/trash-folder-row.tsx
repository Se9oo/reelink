'use client';

import { useId, useState } from 'react';

import { IconChevronRightSmallLine, IconGlobeLine, IconTrashcanLine } from '@karrotmarket/react-monochrome-icon';

import { getChildSummary, isUrgent } from '@/entities/trash/model/trash-view';
import { TrashFolder, TrashLink } from '@/entities/trash/model/types';

import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface TrashFolderRowProps {
	folder: TrashFolder;
	daysLeft: number;
	subfolders: TrashFolder[];
	links: TrashLink[];
	onRestore: () => void;
	onDelete: () => void;
}

export function TrashFolderRow({ folder, daysLeft, subfolders, links, onRestore, onDelete }: TrashFolderRowProps) {
	const [expanded, setExpanded] = useState(false);
	const panelId = useId();
	const { subfolderCount, linkCount } = getChildSummary(folder.id, subfolders, links);
	const hasChildren = subfolderCount > 0 || linkCount > 0;
	const urgent = isUrgent(daysLeft);

	return (
		<div
			className="flex flex-wrap items-start gap-x-2.5 rounded-2xl border
				border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] p-3.5"
		>
			{hasChildren ? (
				<button
					type="button"
					onClick={() => setExpanded((prev) => !prev)}
					aria-label="하위 항목 펼치기"
					aria-expanded={expanded}
					aria-controls={panelId}
					className="flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md
						text-[var(--seed-color-fg-neutral-muted)]"
				>
					<IconChevronRightSmallLine size={15} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
				</button>
			) : (
				<div className="w-[22px] shrink-0" />
			)}

			<IconFolderLine size={20} className="mt-0.5 shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{folder.parentName && (
					<div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{folder.parentName} 안에 있었음</div>
				)}
				<div className="truncate text-[15px] font-semibold text-[var(--seed-color-fg-neutral)]">{folder.name}</div>
				<div className="text-[12.5px] text-[var(--seed-color-fg-neutral-muted)]">
					{hasChildren ? `하위 폴더 ${subfolderCount}개 · 링크 ${linkCount}개` : '비어 있음'}
				</div>
			</div>

			<div
				className={`mt-px shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${
					urgent
						? 'bg-[var(--seed-color-bg-critical-weak)] text-[var(--seed-color-fg-critical)]'
						: 'bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]'
					}`}
			>
				{daysLeft}일 후 삭제
			</div>

			<div
				className="order-last mt-3 ml-8 flex basis-[calc(100%-2rem)] gap-2 lg:order-none lg:mt-0 lg:ml-0 lg:basis-auto"
			>
				<button
					type="button"
					onClick={onRestore}
					className="flex h-[34px] flex-1 cursor-pointer items-center justify-center rounded-lg
						bg-[var(--seed-color-bg-brand-weak)] text-[13.5px] font-semibold text-[var(--seed-color-fg-brand)]
						active:bg-[var(--seed-color-bg-brand-weak-pressed)] lg:h-[30px] lg:flex-none lg:px-3 lg:text-[12.5px]"
				>
					복구
				</button>
				<button
					type="button"
					onClick={onDelete}
					aria-label="영구 삭제"
					className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-critical-weak)]
						hover:text-[var(--seed-color-fg-critical)] lg:h-[30px] lg:w-[30px]"
				>
					<IconTrashcanLine size={16} />
				</button>
			</div>

			{hasChildren && (
				<div
					id={panelId}
					inert={!expanded}
					className={`ml-8 grid basis-[calc(100%-2rem)] transition-[grid-template-rows,visibility] duration-200 ease-out
					motion-reduce:transition-none ${expanded ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
				>
					<div className="min-h-0 overflow-hidden">
						<div className="pt-3">
							<div className="flex flex-col gap-2 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2.5">
								<div className="text-[11px] text-[var(--seed-color-fg-neutral-muted)]">
									각 항목은 해당 목록에서 따로 복구할 수 있어요
								</div>
								{subfolders
									.filter((sub) => sub.parentFolderId === folder.id)
									.map((sub) => (
										<div key={sub.id} className="flex items-center gap-2">
											<IconFolderLine size={15} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
											<div className="truncate text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">{sub.name}</div>
										</div>
									))}
								{links
									.filter((link) => link.folderId === folder.id)
									.map((link) => (
										<div key={link.id} className="flex items-center gap-2">
											<IconGlobeLine size={15} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
											<div className="truncate text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">
												{link.title ?? link.url}
											</div>
										</div>
									))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
