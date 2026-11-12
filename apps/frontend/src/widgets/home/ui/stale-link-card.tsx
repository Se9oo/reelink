'use client';

import { IconGlobeLine } from '@karrotmarket/react-monochrome-icon';
import { ActionButton } from 'seed-design/ui/action-button';

import { Link } from '@/entities/link/model/types';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';

interface StaleLinkCardProps {
	link: Link;
	onView: () => void;
	onDelete: () => void;
}

export function StaleLinkCard({ link, onView, onDelete }: StaleLinkCardProps) {
	const host = new URL(link.url).hostname;

	return (
		<li
			className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] p-3.5 md:rounded-[14px] md:p-0 md:pb-3.5"
		>
			<div className="flex min-w-0 flex-1 items-center gap-3 md:flex-col md:items-stretch md:gap-2.5">
				<div
					className="flex aspect-[4/3] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[10px]
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)] md:aspect-[1.91/1]
						md:w-full md:rounded-none"
				>
					{link.thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={link.thumbnailUrl} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />
					) : (
						<IconGlobeLine size={22} />
					)}
				</div>
				<div className="min-w-0 flex-1 md:px-3.5">
					<p className="line-clamp-2 text-sm leading-snug font-bold text-[var(--seed-color-fg-neutral)] md:min-h-[2lh]">
						{link.title ?? host}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--seed-color-fg-neutral-muted)]">
						{host},{' '}
						<strong className="font-bold text-[var(--seed-color-fg-brand)]">
							{formatRelativeTime(link.createdAt)} 저장
						</strong>
					</p>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2 md:px-3.5">
				<ActionButton variant="neutralWeak" size="medium" onClick={onDelete}>
					지울래요
				</ActionButton>
				<ActionButton asChild variant="brandOutline" size="medium">
					<a href={link.url} target="_blank" rel="noopener noreferrer" onClick={onView}>
						볼래요
					</a>
				</ActionButton>
			</div>
		</li>
	);
}
