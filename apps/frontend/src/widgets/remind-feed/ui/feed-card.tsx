'use client';

import { Link } from '@/entities/link/model/types';

import { formatRelativeTime } from '@/shared/lib/format-relative-time';

const FALLBACK_COLORS = ['#2f6f5e', '#3a3d44', '#5b4b8a', '#8a4b5b', '#2f5a8a', '#7a5a2f'];

function fallbackColor(host: string) {
	const sum = [...host].reduce((total, char) => total + char.charCodeAt(0), 0);

	return FALLBACK_COLORS[sum % FALLBACK_COLORS.length];
}

interface FeedCardProps {
	link: Link;
	position: number;
	total: number;
	folderPath: string;
	viewed: boolean;
	onOpen: () => void;
}

export function FeedCard({ link, position, total, folderPath, viewed, onOpen }: FeedCardProps) {
	const host = new URL(link.url).hostname;

	return (
		<a
			href={link.url}
			target="_blank"
			rel="noopener noreferrer"
			onClick={onOpen}
			className="relative block h-full w-full overflow-hidden rounded-[22px]
				text-[var(--seed-color-palette-static-white)] select-none"
		>
			{link.thumbnailUrl ? (
				<>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={link.thumbnailUrl}
						alt=""
						aria-hidden="true"
						className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-75"
					/>
					<div className="absolute inset-x-0 top-[20%] bottom-[30%] flex items-center justify-center px-4">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={link.thumbnailUrl}
							alt=""
							className="max-h-full max-w-full rounded-xl object-contain shadow-[0_8px_24px_rgb(0_0_0/0.3)]"
						/>
					</div>
				</>
			) : (
				<div className="absolute inset-0" style={{ background: fallbackColor(host) }}>
					<div
						className="absolute inset-x-6 top-0 bottom-[45%] flex items-center justify-center text-center text-3xl
							font-extrabold break-all opacity-90"
					>
						{host}
					</div>
				</div>
			)}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-[rgb(10_14_20/0.82)] to-80%" />

			<div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between text-xs font-semibold">
				<span className="rounded-full bg-[rgb(0_0_0/0.35)] px-2.5 py-1 backdrop-blur-sm">
					{position} / {total}
				</span>
				{viewed ? (
					<span className="rounded-full bg-[var(--seed-color-bg-brand-solid)] px-2.5 py-1">봤어요</span>
				) : (
					<span className="rounded-full bg-[rgb(0_0_0/0.35)] px-2.5 py-1 backdrop-blur-sm">
						{formatRelativeTime(link.createdAt)} 저장
					</span>
				)}
			</div>

			<div className="absolute inset-x-[18px] bottom-[22px] flex flex-col gap-2.5">
				{link.savedReason ? (
					<>
						<p className="text-[19px] leading-snug font-bold text-balance">{link.savedReason}</p>
						<p className="line-clamp-2 text-sm leading-relaxed opacity-90">{link.title ?? host}</p>
					</>
				) : (
					<p className="line-clamp-3 text-[19px] leading-snug font-bold text-balance">{link.title ?? host}</p>
				)}
				<p className="flex flex-wrap items-center gap-1.5 text-xs opacity-75">
					<span>{host}</span>
					<span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-current" />
					<span>{folderPath}</span>
				</p>
			</div>
		</a>
	);
}
