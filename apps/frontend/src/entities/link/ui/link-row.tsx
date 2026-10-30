'use client';

import {
	IconDot3HorizontalFill,
	IconGlobeLine,
	IconPencilLine,
	IconPushpinFill,
	IconPushpinLine,
	IconPushpinSlashLine,
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
	onTogglePin: () => void;
}

function PinBadge({ className }: { className: string }) {
	return (
		<span
			role="img"
			aria-label="고정됨"
			className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]
				text-[var(--seed-color-palette-static-white)] ring-2 ring-[var(--seed-color-bg-layer-default)] ${className}`}
		>
			<IconPushpinFill size={12} />
		</span>
	);
}

export function LinkRow({ link, folderPath, onMove, onEdit, onDelete, onTogglePin }: LinkRowProps) {
	const host = new URL(link.url).hostname;

	return (
		<div
			className="relative isolate flex items-start gap-3 py-3 pr-2 pl-4 md:flex-col md:gap-0 md:overflow-hidden
				md:rounded-[14px] md:border md:border-[var(--seed-color-stroke-neutral-subtle)]
				md:bg-[var(--seed-color-bg-layer-default)] md:p-0 md:transition-colors
				md:hover:border-[var(--seed-color-stroke-neutral-muted)]"
		>
			<div className="relative shrink-0 md:hidden">
				<div
					className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[10px]
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]"
				>
					{link.thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={link.thumbnailUrl} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />
					) : (
						<IconGlobeLine size={22} />
					)}
				</div>
				{link.pinnedAt && <PinBadge className="-top-1.5 -left-1.5" />}
			</div>

			<div
				className={`relative hidden aspect-[1.91/1] w-full overflow-hidden md:block ${
					link.thumbnailUrl ? 'bg-[#2b2e35]' : 'bg-[var(--seed-color-bg-neutral-weak)]'
				}`}
			>
				{link.thumbnailUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={link.thumbnailUrl} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />
				) : (
					<div
						aria-hidden="true"
						className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center
							text-[var(--seed-color-fg-neutral-muted)]"
					>
						<IconGlobeLine size={28} />
						<span className="text-[13px] font-semibold break-all">{host}</span>
					</div>
				)}
				{link.pinnedAt && <PinBadge className="top-2 left-2" />}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5 md:w-full md:gap-2 md:p-4 md:pb-3.5">
				{folderPath && (
					<div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{folderPath} 안에 있음</div>
				)}
				<a
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					className="line-clamp-2 text-[14.5px] leading-snug font-semibold text-[var(--seed-color-fg-neutral)]
						after:absolute after:inset-0 md:line-clamp-1 md:text-base md:font-bold"
				>
					{link.title ?? host}
				</a>
				{link.savedReason ? (
					<div
						className="line-clamp-2 text-[12.5px] leading-normal text-[var(--seed-color-fg-neutral-subtle)]
							md:line-clamp-3 md:text-[13px]"
					>
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
				<div
					className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--seed-color-fg-neutral-muted)] md:pr-9"
				>
					<span className="truncate">{host}</span>
					<span aria-hidden="true" className="h-[3px] w-[3px] shrink-0 rounded-full bg-current opacity-60" />
					<span className="shrink-0">{formatRelativeTime(link.createdAt)} 저장</span>
				</div>
			</div>

			<MenuRoot size="small">
				<MenuTrigger asChild>
					<button
						type="button"
						aria-label="더보기"
						className="relative z-10 -ml-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak)] md:absolute
							md:right-1.5 md:bottom-1.5 md:ml-0"
					>
						<IconDot3HorizontalFill size={20} />
					</button>
				</MenuTrigger>
				<MenuContent>
					<MenuGroup>
						{link.pinnedAt ? (
							<MenuItem label="고정 해제" prefixIcon={<IconPushpinSlashLine />} onClick={onTogglePin} />
						) : (
							<MenuItem label="상단 고정" prefixIcon={<IconPushpinLine />} onClick={onTogglePin} />
						)}
						{onMove && <MenuItem label="폴더 이동" prefixIcon={<IconFolderLine />} onClick={onMove} />}
						<MenuItem label="수정" prefixIcon={<IconPencilLine />} onClick={onEdit} />
						<MenuItem label="삭제" prefixIcon={<IconTrashcanLine />} onClick={onDelete} />
					</MenuGroup>
				</MenuContent>
			</MenuRoot>
		</div>
	);
}
