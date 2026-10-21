'use client';

import { IconGlobeLine } from '@karrotmarket/react-monochrome-icon';

import { Link } from '@/entities/link/model/types';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';

interface HomeLinkCardProps {
	link: Link;
	className?: string;
}

export function HomeLinkCard({ link, className = '' }: HomeLinkCardProps) {
	const host = new URL(link.url).hostname;

	return (
		<a
			href={link.url}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex flex-col overflow-hidden rounded-[14px] border border-[var(--seed-color-stroke-neutral-subtle)]
				bg-[var(--seed-color-bg-layer-default)] transition-colors hover:border-[var(--seed-color-stroke-neutral-muted)]
				${className}`}
		>
			<div
				className="flex aspect-[1.91/1] w-full items-center justify-center overflow-hidden
					bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]"
			>
				{link.thumbnailUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={link.thumbnailUrl} alt="" className="h-full w-full object-cover" />
				) : (
					<IconGlobeLine size={24} />
				)}
			</div>
			<div className="flex flex-col gap-1 px-3 pt-2.5 pb-3">
				<p className="line-clamp-2 text-[13.5px] leading-snug font-bold text-[var(--seed-color-fg-neutral)]">
					{link.title ?? host}
				</p>
				<p className="truncate text-[11.5px] text-[var(--seed-color-fg-neutral-muted)]">
					{host} · {formatRelativeTime(link.createdAt)} 저장
				</p>
			</div>
		</a>
	);
}
