'use client';

import { useId, useState } from 'react';

import {
	IconChevronRightSmallLine,
	IconDot3HorizontalFill,
	IconGlobeLine,
	IconTrashcanLine,
} from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { isUrgent, TrashItem } from '@/entities/trash/model/trash-view';

import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface TrashItemRowProps {
	item: TrashItem;
	onRestore: () => void;
	onDelete: () => void;
}

export function TrashItemRow({ item, onRestore, onDelete }: TrashItemRowProps) {
	const [expanded, setExpanded] = useState(false);
	const panelId = useId();
	const { caption, title, meta, thumbnail } = describe(item);
	const children = item.kind === 'folder' ? item.children : null;
	const hasChildren = children !== null && (children.folders.length > 0 || children.links.length > 0);

	return (
		<li className="flex flex-col">
			<div className="flex items-center gap-3 px-4 py-2.5 lg:gap-3.5 lg:px-[18px] lg:py-3">
				<div
					className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] lg:h-11
						lg:w-11 ${
							item.kind === 'folder'
								? 'bg-[var(--seed-color-bg-brand-weak)] text-[var(--seed-color-fg-brand)]'
								: 'bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]'
						}`}
				>
					{thumbnail}
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					{caption && <div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{caption}</div>}
					<div className="truncate text-[14.5px] font-semibold text-[var(--seed-color-fg-neutral)] lg:text-[15px]">
						{title}
					</div>
					<div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--seed-color-fg-neutral-muted)]">
						{hasChildren ? (
							<button
								type="button"
								onClick={() => setExpanded((prev) => !prev)}
								aria-label="하위 항목 펼치기"
								aria-expanded={expanded}
								aria-controls={panelId}
								className="flex min-w-0 cursor-pointer items-center gap-0.5 hover:text-[var(--seed-color-fg-neutral)]"
							>
								<span className="truncate">{meta}</span>
								<IconChevronRightSmallLine
									size={14}
									className={`shrink-0 transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`}
								/>
							</button>
						) : (
							<span className="truncate">{meta}</span>
						)}
						<span aria-hidden="true" className="h-[3px] w-[3px] shrink-0 rounded-full bg-current opacity-60" />
						<span
							className={`shrink-0
								${isUrgent(item.daysLeft) ? 'font-semibold text-[var(--seed-color-fg-critical)]' : ''}`}
						>
							{item.daysLeft}일 남음
						</span>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onRestore}
						className="h-[30px] cursor-pointer rounded-lg bg-[var(--seed-color-bg-brand-weak)] px-3 text-[12.5px]
							font-bold text-[var(--seed-color-fg-brand)] active:bg-[var(--seed-color-bg-brand-weak-pressed)]"
					>
						복구
					</button>
					<MenuRoot size="small">
						<MenuTrigger asChild>
							<button
								type="button"
								aria-label="더보기"
								className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg
									text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
							>
								<IconDot3HorizontalFill size={18} />
							</button>
						</MenuTrigger>
						<MenuContent>
							<MenuGroup>
								<MenuItem tone="critical" label="영구 삭제" prefixIcon={<IconTrashcanLine />} onClick={onDelete} />
							</MenuGroup>
						</MenuContent>
					</MenuRoot>
				</div>
			</div>

			{hasChildren && (
				<div
					id={panelId}
					inert={!expanded}
					className={`grid transition-[grid-template-rows,visibility] duration-200 ease-out
					motion-reduce:transition-none ${expanded ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
				>
					<div className="min-h-0 overflow-hidden">
						<div className="pr-4 pb-3 pl-[80px] lg:pr-[18px] lg:pl-[76px]">
							<div className="flex flex-col gap-2 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] px-3 py-2.5">
								<div className="text-[11px] text-[var(--seed-color-fg-neutral-muted)]">
									각 항목은 목록에서 따로 복구할 수 있어요
								</div>
								{children.folders.map((sub) => (
									<div key={sub.id} className="flex items-center gap-2">
										<IconFolderLine size={15} className="w-5 shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
										<div className="truncate text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">{sub.name}</div>
									</div>
								))}
								{children.links.map((link) => (
									<div key={link.id} className="flex items-center gap-2">
										{link.thumbnailUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={link.thumbnailUrl}
												referrerPolicy="no-referrer"
												alt=""
												className="h-5 w-5 shrink-0 rounded object-cover"
											/>
										) : (
											<IconGlobeLine size={15} className="w-5 shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
										)}
										<div className="truncate text-[13.5px] text-[var(--seed-color-fg-neutral-muted)]">
											{link.title ?? new URL(link.url).hostname}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</li>
	);
}

function describe(item: TrashItem) {
	if (item.kind === 'folder') {
		const subfolderCount = item.children.folders.length;
		const linkCount = item.children.links.length;

		return {
			caption: item.folder.parentName && `${item.folder.parentName} 안에 있었음`,
			title: item.folder.name,
			meta: subfolderCount > 0 || linkCount > 0 ? `폴더 ${subfolderCount} · 링크 ${linkCount}` : '비어 있음',
			thumbnail: <IconFolderLine size={22} />,
		};
	}

	const { link } = item;
	const host = new URL(link.url).hostname;

	return {
		caption: link.parentFolderName && `${link.parentFolderName} 안에 있었음`,
		title: link.title ?? host,
		meta: host,
		thumbnail: link.thumbnailUrl ? (
			// eslint-disable-next-line @next/next/no-img-element
			<img src={link.thumbnailUrl} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />
		) : (
			<IconGlobeLine size={20} />
		),
	};
}
