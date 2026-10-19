'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';

import { ResponsivePair } from '@seed-design/react';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';

import { type UpdateLinkFields } from '@/entities/link/api/update-link';
import { Link } from '@/entities/link/model/types';

import { useMediaQuery } from '@/shared/lib/use-media-query';

interface EditLinkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	link: Link;
	onSave: (fields: UpdateLinkFields) => void;
}

export function EditLinkDialog({ open, onOpenChange, link, onSave }: EditLinkDialogProps) {
	const isTabletUp = useMediaQuery('(min-width: 768px)');
	const [title, setTitle] = useState(link.title ?? '');
	const [savedReason, setSavedReason] = useState(link.savedReason ?? '');
	const host = new URL(link.url).hostname;

	const titleChanged = title.trim() !== (link.title ?? '');
	const savedReasonChanged = savedReason.trim() !== (link.savedReason ?? '');
	const changed = titleChanged || savedReasonChanged;

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!changed) {
			return;
		}

		onSave({
			...(titleChanged && { title: title.trim() || null }),
			...(savedReasonChanged && { savedReason: savedReason.trim() || null }),
		});
		onOpenChange(false);
	}

	const fields = (
		<div className="flex flex-col gap-4">
			<TextField label="제목" indicator="선택">
				<TextFieldInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder={host} />
			</TextField>
			<TextField label="저장 이유" indicator="선택">
				<TextFieldTextarea
					value={savedReason}
					onChange={(event) => setSavedReason(event.target.value)}
					placeholder="왜 저장했는지 짧게 적어두세요"
					className="max-h-40 overflow-y-auto"
				/>
			</TextField>
		</div>
	);

	const footer = (
		<ResponsivePair gap="x2">
			<ActionButton type="button" variant="neutralWeak" onClick={() => onOpenChange(false)} flexGrow={1}>
				취소
			</ActionButton>
			<ActionButton type="submit" variant="brandSolid" disabled={!changed} flexGrow={1}>
				저장
			</ActionButton>
		</ResponsivePair>
	);

	if (isTabletUp) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent title="링크 수정">
					<form onSubmit={handleSubmit}>
						<DialogBody>{fields}</DialogBody>
						<DialogFooter>{footer}</DialogFooter>
					</form>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title="링크 수정">
				<form onSubmit={handleSubmit}>
					<BottomSheetBody>{fields}</BottomSheetBody>
					<BottomSheetFooter>{footer}</BottomSheetFooter>
				</form>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}
