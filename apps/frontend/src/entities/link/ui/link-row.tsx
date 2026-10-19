'use client';

import {
	IconDot3HorizontalFill,
	IconGlobeLine,
	IconPencilLine,
	IconTrashcanLine,
} from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { Link } from '@/entities/link/model/types';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface LinkRowProps {
	link: Link;
	folderPath?: string;
	onMove?: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export function LinkRow({ link, folderPath, onMove, onEdit, onDelete }: LinkRowProps) {
	const host = new URL(link.url).hostname;

	return (
		<div
			className="relative isolate flex items-start gap-1 py-3 pr-2 pl-4 md:rounded-[14px] md:border
				md:border-[var(--seed-color-stroke-neutral-subtle)] md:bg-[var(--seed-color-bg-layer-default)] md:py-3.5
				md:pl-3.5 md:transition-colors md:hover:border-[var(--seed-color-stroke-neutral-muted)]"
		>
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<div
					className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px]
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)] md:h-16 md:w-16"
				>
					{link.thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={link.thumbnailUrl} alt="" className="h-full w-full object-cover" />
					) : (
						<IconGlobeLine size={22} />
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-1.5">
					{folderPath && (
						<div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{folderPath} 안에 있음</div>
					)}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						className="line-clamp-2 text-[14.5px] leading-snug font-semibold text-[var(--seed-color-fg-neutral)]
							after:absolute after:inset-0"
					>
						{link.title ?? host}
					</a>
					{link.savedReason ? (
						<div className="line-clamp-2 text-[12.5px] leading-normal text-[var(--seed-color-fg-neutral-subtle)]">
							{link.savedReason}
						</div>
					) : (
						<button
							type="button"
							onClick={onEdit}
							aria-label="저장 이유 남기기"
							className="relative z-10 cursor-pointer self-start truncate text-[12.5px]
								text-[var(--seed-color-fg-neutral-muted)] underline decoration-dotted underline-offset-2"
						>
							+ 저장 이유 남기기
						</button>
					)}
					<div className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">
						<span className="truncate">{host}</span>
						<span aria-hidden="true" className="h-[3px] w-[3px] shrink-0 rounded-full bg-current opacity-60" />
						<span className="shrink-0">{formatRelativeTime(link.createdAt)} 저장</span>
					</div>
				</div>
			</div>

			<MenuRoot size="small">
				<MenuTrigger asChild>
					<button
						type="button"
						aria-label="더보기"
						className="relative z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
					>
						<IconDot3HorizontalFill size={20} />
					</button>
				</MenuTrigger>
				<MenuContent>
					<MenuGroup>
						{onMove && <MenuItem label="폴더 이동" prefixIcon={<IconFolderLine />} onClick={onMove} />}
						<MenuItem label="수정" prefixIcon={<IconPencilLine />} onClick={onEdit} />
						<MenuItem label="삭제" prefixIcon={<IconTrashcanLine />} onClick={onDelete} />
					</MenuGroup>
				</MenuContent>
			</MenuRoot>
		</div>
	);
}
