'use client';

import { Skeleton } from '@seed-design/react';

import { useLinkThumbnail } from '@/entities/link/api/refresh-thumbnail';
import { hostColor } from '@/entities/link/model/host-color';
import { Link } from '@/entities/link/model/types';

const POSITIONS = [
	'left-0 top-[18px] -rotate-[7deg]',
	'left-6 top-2 -rotate-1',
	'left-12 top-0 rotate-[6deg]',
] as const;

interface RemindPreviewStackProps {
	links: Link[];
}

export function RemindPreviewStack({ links }: RemindPreviewStackProps) {
	if (links.length === 0) {
		return null;
	}

	const cards = links.slice(0, POSITIONS.length).reverse();
	const offset = POSITIONS.length - cards.length;

	return (
		<div aria-hidden="true" className="relative hidden h-[196px] w-[168px] shrink-0 md:block">
			{cards.map((link, index) => (
				<PreviewCard key={link.id} link={link} position={POSITIONS[index + offset]} />
			))}
		</div>
	);
}

function PreviewCard({ link, position }: { link: Link; position: (typeof POSITIONS)[number] }) {
	const host = new URL(link.url).hostname;
	const { thumbnailUrl, loading, onError: onThumbnailError } = useLinkThumbnail(link);

	return (
		<div
			className={`absolute h-[168px] w-[120px] overflow-hidden rounded-[14px]
				text-[var(--seed-color-palette-static-white)] shadow-[0_8px_20px_rgb(16_40_80/0.14)] ${position}`}
			style={thumbnailUrl || loading ? undefined : { background: hostColor(host) }}
		>
			{loading && <Skeleton radius="0" width="full" height="full" className="absolute inset-0" />}
			{thumbnailUrl && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={thumbnailUrl}
					referrerPolicy="no-referrer"
					alt=""
					onError={onThumbnailError}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			)}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[rgb(10_14_20/0.72)]" />
			<p className="absolute inset-x-2.5 bottom-2.5 line-clamp-3 text-[11px] leading-snug font-bold">
				{link.savedReason ?? link.title ?? host}
			</p>
		</div>
	);
}
