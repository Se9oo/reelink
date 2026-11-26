'use client';

import { useState } from 'react';

import { IconGlobeLine } from '@karrotmarket/react-monochrome-icon';
import { ResponsivePair } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';

import { useLinkThumbnail } from '@/entities/link/api/refresh-thumbnail';
import { Link } from '@/entities/link/model/types';

import { useMediaQuery } from '@/shared/lib/use-media-query';

interface AutoSortSelectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	links: Link[];
	remaining: number;
	isPending: boolean;
	onConfirm: (linkIds: string[]) => void;
}

export function AutoSortSelectDialog({
	open,
	onOpenChange,
	links,
	remaining,
	isPending,
	onConfirm,
}: AutoSortSelectDialogProps) {
	const isTabletUp = useMediaQuery('(min-width: 768px)');
	const oldestFirst = [...links].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const [selected, setSelected] = useState(() => new Set(oldestFirst.slice(0, remaining).map(({ id }) => id)));
	const isFull = selected.size >= remaining;
	const title = '분석할 링크 고르기';

	function toggle(linkId: string, checked: boolean) {
		setSelected((current) => {
			const next = new Set(current);

			if (checked) {
				next.add(linkId);
			} else {
				next.delete(linkId);
			}

			return next;
		});
	}

	const body = (
		<div className="flex flex-col gap-3">
			<ul className="flex flex-col">
				{oldestFirst.map((link) => {
					const checked = selected.has(link.id);

					return (
						<SelectableLinkRow
							key={link.id}
							link={link}
							checked={checked}
							disabled={!checked && isFull}
							onToggle={(next) => toggle(link.id, next)}
						/>
					);
				})}
			</ul>
			<p className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
				링크 제목, 설명, URL, 저장 이유와 폴더 이름, 폴더 안 링크 제목이 Anthropic(Claude)으로 보내져요
			</p>
		</div>
	);

	const footer = (
		<ResponsivePair gap="x2">
			<ActionButton variant="neutralWeak" onClick={() => onOpenChange(false)} flexGrow={1}>
				취소
			</ActionButton>
			<ActionButton
				variant="brandSolid"
				disabled={selected.size === 0}
				loading={isPending}
				onClick={() => onConfirm(oldestFirst.filter(({ id }) => selected.has(id)).map(({ id }) => id))}
				flexGrow={1}
			>
				{`${selected.size}개 분석하기`}
			</ActionButton>
		</ResponsivePair>
	);

	if (isTabletUp) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent title={title}>
					<DialogBody>{body}</DialogBody>
					<DialogFooter>{footer}</DialogFooter>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title={title}>
				<BottomSheetBody>{body}</BottomSheetBody>
				<BottomSheetFooter>{footer}</BottomSheetFooter>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}

interface SelectableLinkRowProps {
	link: Link;
	checked: boolean;
	disabled: boolean;
	onToggle: (checked: boolean) => void;
}

function SelectableLinkRow({ link, checked, disabled, onToggle }: SelectableLinkRowProps) {
	const host = new URL(link.url).hostname;
	const { thumbnailUrl, onError } = useLinkThumbnail(link);

	return (
		<li>
			<label className="flex cursor-pointer items-center gap-3 py-2 has-[:disabled]:cursor-not-allowed">
				<input
					type="checkbox"
					aria-label={link.title ?? host}
					checked={checked}
					disabled={disabled}
					onChange={(event) => onToggle(event.target.checked)}
					className="size-5 shrink-0 cursor-pointer accent-[var(--seed-color-bg-brand-solid)]
						disabled:cursor-not-allowed"
				/>
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg
						bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]"
				>
					{thumbnailUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumbnailUrl}
							referrerPolicy="no-referrer"
							alt=""
							onError={onError}
							className="h-full w-full object-cover"
						/>
					) : (
						<IconGlobeLine size={18} />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-sm text-[var(--seed-color-fg-neutral)]">{link.title ?? host}</span>
					{link.title && <span className="truncate text-xs text-[var(--seed-color-fg-neutral-muted)]">{host}</span>}
				</div>
			</label>
		</li>
	);
}
