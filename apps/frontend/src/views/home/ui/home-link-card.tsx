'use client';

import type { ReactNode } from 'react';

import { IconGlobeLine } from '@karrotmarket/react-monochrome-icon';
import { Skeleton } from '@seed-design/react';

import { useLinkThumbnail } from '@/entities/link/api/refresh-thumbnail';
import { useViewLink } from '@/entities/link/api/view-link';
import { Link } from '@/entities/link/model/types';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';

interface HomeLinkCardProps {
	link: Link;
	className?: string;
	caption?: ReactNode;
	actions?: ReactNode;
}

export function HomeLinkCard({ link, className = '', caption, actions }: HomeLinkCardProps) {
	const host = new URL(link.url).hostname;
	const { thumbnailUrl, loading, onError: onThumbnailError } = useLinkThumbnail(link);
	const viewLink = useViewLink();
	const unviewed = link.status === 'unviewed';

	function markViewed() {
		if (unviewed) {
			viewLink.mutate(link.id);
		}
	}

	return (
		<div
			className={`relative flex flex-col overflow-hidden rounded-[14px] border
				border-[var(--seed-color-stroke-neutral-subtle)] bg-[var(--seed-color-bg-layer-default)] transition-colors
				hover:border-[var(--seed-color-stroke-neutral-muted)] ${className}`}
		>
			<div
				className="flex aspect-[1.91/1] w-full items-center justify-center overflow-hidden
					bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]"
			>
				{thumbnailUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={thumbnailUrl}
						referrerPolicy="no-referrer"
						alt=""
						onError={onThumbnailError}
						className="h-full w-full object-cover"
					/>
				) : loading ? (
					<Skeleton radius="0" width="full" height="full" />
				) : (
					<IconGlobeLine size={24} />
				)}
			</div>
			<div className="flex flex-1 flex-col justify-between gap-1 px-3 pt-2.5 pb-3">
				<div className="flex items-start gap-1.5">
					{unviewed && (
						<span
							role="img"
							aria-label="안 봤어요"
							className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--seed-color-bg-brand-solid)]"
						/>
					)}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={markViewed}
						onAuxClick={markViewed}
						className="line-clamp-2 min-h-[2lh] min-w-0 text-sm leading-snug font-bold
							text-[var(--seed-color-fg-neutral)] after:absolute after:inset-0"
					>
						{link.title ?? host}
					</a>
				</div>
				<div className="flex items-end gap-1">
					<div className="min-w-0 flex-1">
						{caption ?? (
							<p className="truncate text-xs text-[var(--seed-color-fg-neutral-muted)]">
								{host} · {formatRelativeTime(link.createdAt)} 저장
							</p>
						)}
					</div>
					{actions && <div className="relative z-10 -mr-1.5 -mb-1.5 shrink-0">{actions}</div>}
				</div>
			</div>
		</div>
	);
}
