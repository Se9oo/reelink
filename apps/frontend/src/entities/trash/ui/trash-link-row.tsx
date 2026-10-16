'use client';

import { IconGlobeLine, IconTrashcanLine } from '@karrotmarket/react-monochrome-icon';

import { isUrgent } from '@/entities/trash/model/trash-view';
import { TrashLink } from '@/entities/trash/model/types';

interface TrashLinkRowProps {
	link: TrashLink;
	daysLeft: number;
	onRestore: () => void;
	onDelete: () => void;
}

export function TrashLinkRow({ link, daysLeft, onRestore, onDelete }: TrashLinkRowProps) {
	const urgent = isUrgent(daysLeft);
	const host = new URL(link.url).hostname;

	return (
		<div
			className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] px-3.5 py-3"
		>
			<div
				className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--seed-color-bg-neutral-weak)]
					text-[var(--seed-color-fg-neutral-muted)] lg:h-[34px] lg:w-[34px]"
			>
				<IconGlobeLine size={18} />
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{link.parentFolderName && (
					<div className="text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">
						{link.parentFolderName} 안에 있었음
					</div>
				)}
				<div className="truncate text-sm font-semibold text-[var(--seed-color-fg-neutral)]">{link.title ?? host}</div>
				<div className="truncate text-xs text-[var(--seed-color-fg-neutral-muted)]">{host}</div>
			</div>

			<div
				className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${
					urgent
						? 'bg-[var(--seed-color-bg-critical-weak)] text-[var(--seed-color-fg-critical)]'
						: 'bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]'
					}`}
			>
				{daysLeft}일 후 삭제
			</div>

			<div className="flex basis-full gap-2 lg:basis-auto">
				<button
					type="button"
					onClick={onRestore}
					className="flex h-8 flex-1 cursor-pointer items-center justify-center rounded-lg
						bg-[var(--seed-color-bg-brand-weak)] text-[13px] font-semibold text-[var(--seed-color-fg-brand)]
						active:bg-[var(--seed-color-bg-brand-weak-pressed)] lg:h-[30px] lg:flex-none lg:px-3 lg:text-[12.5px]"
				>
					복구
				</button>
				<button
					type="button"
					onClick={onDelete}
					aria-label="영구 삭제"
					className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg
						text-[var(--seed-color-fg-neutral-muted)] hover:bg-[var(--seed-color-bg-critical-weak)]
						hover:text-[var(--seed-color-fg-critical)] lg:h-[30px] lg:w-[30px]"
				>
					<IconTrashcanLine size={15} />
				</button>
			</div>
		</div>
	);
}
