'use client';

import { useState } from 'react';

import { ResponsivePair } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';

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
					const label = link.title ?? new URL(link.url).hostname;
					const checked = selected.has(link.id);

					return (
						<li key={link.id} className="flex items-center gap-3 py-2">
							<input
								type="checkbox"
								aria-label={label}
								checked={checked}
								disabled={!checked && isFull}
								onChange={(event) => toggle(link.id, event.target.checked)}
								className="size-5 shrink-0 cursor-pointer accent-[var(--seed-color-bg-brand-solid)]
									disabled:cursor-not-allowed"
							/>
							<span className="min-w-0 flex-1 truncate text-sm text-[var(--seed-color-fg-neutral)]">{label}</span>
						</li>
					);
				})}
			</ul>
			<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">
				오늘 {remaining}개까지 보낼 수 있어요, 매일 자정에 초기화돼요
			</p>
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
