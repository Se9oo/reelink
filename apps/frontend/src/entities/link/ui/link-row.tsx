'use client';

import { IconDot3HorizontalFill, IconGlobeLine, IconTrashcanLine } from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { Link } from '@/entities/link/model/types';

import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface LinkRowProps {
	link: Link;
	folderPath?: string;
	onMove?: () => void;
	onDelete: () => void;
}

export function LinkRow({ link, folderPath, onMove, onDelete }: LinkRowProps) {
	const host = new URL(link.url).hostname;

	return (
		<div className="flex items-center gap-1 py-2.5 pr-2 pl-4 lg:py-3 lg:pr-3">
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4"
			>
				<div
					className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]"
				>
					{link.thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={link.thumbnailUrl} alt="" className="h-full w-full object-cover" />
					) : (
						<IconGlobeLine size={22} />
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-0.5">
					{folderPath && (
						<div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{folderPath} 안에 있음</div>
					)}
					<div className="truncate text-[14.5px] font-semibold text-[var(--seed-color-fg-neutral)]">
						{link.title ?? host}
					</div>
					<div className="truncate text-[12.5px] text-[var(--seed-color-fg-neutral-muted)]">
						{link.savedReason || '저장 이유 없음'}
					</div>
					<div className="truncate text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">{host}</div>
				</div>
			</a>

			<MenuRoot size="small">
				<MenuTrigger asChild>
					<button
						type="button"
						aria-label="더보기"
						className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
					>
						<IconDot3HorizontalFill size={20} />
					</button>
				</MenuTrigger>
				<MenuContent>
					<MenuGroup>
						{onMove && <MenuItem label="폴더 이동" prefixIcon={<IconFolderLine />} onClick={onMove} />}
						<MenuItem label="삭제" prefixIcon={<IconTrashcanLine />} onClick={onDelete} />
					</MenuGroup>
				</MenuContent>
			</MenuRoot>
		</div>
	);
}
