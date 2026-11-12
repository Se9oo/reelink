'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';

import NextLink from 'next/link';

import { IconExclamationmarkCircleFill } from '@karrotmarket/react-monochrome-icon';
import { dateOnOrAfter, type DatePickerDate, ResponsivePair, type TimePickerValue } from '@seed-design/react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { Callout } from 'seed-design/ui/callout';
import { DatePicker } from 'seed-design/ui/date-picker';
import { DialogBody, DialogContent, DialogFooter, DialogRoot } from 'seed-design/ui/dialog';
import { TimePicker } from 'seed-design/ui/time-picker';

import { partsToRemindAt, remindAtToParts, tenMinutesLater } from '@/features/link-actions/model/remind-at';

import { Link } from '@/entities/link/model/types';
import { notificationSettingsQueryOptions } from '@/entities/notification/api/get-notification-settings';

import { ROUTES } from '@/shared/config/routes';
import { useMediaQuery } from '@/shared/lib/use-media-query';

interface RemindLinkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	link: Link;
	onSave: (remindAt: Date) => void;
}

export function RemindLinkDialog({ open, onOpenChange, link, onSave }: RemindLinkDialogProps) {
	const isTabletUp = useMediaQuery('(min-width: 768px)');
	const [now] = useState(() => new Date());
	const [initial] = useState(() => remindAtToParts(link.remindAt ? new Date(link.remindAt) : tenMinutesLater(now)));
	const [date, setDate] = useState<DatePickerDate>(initial.date);
	const [time, setTime] = useState<TimePickerValue>(initial.time);
	const { data: settings } = useQuery(notificationSettingsQueryOptions());

	const today = remindAtToParts(now).date;
	const remindAt = partsToRemindAt(date, time);
	const isPast = remindAt <= now;
	const changed = !link.remindAt || remindAt.getTime() !== new Date(link.remindAt).getTime();
	const canSave = !isPast && changed;
	const hasNoChannel =
		settings !== undefined &&
		!(settings.notificationMethod === 'kakao' && settings.kakaoStatus === 'active') &&
		settings.pushSubscriptionCount === 0;

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (canSave) {
			onSave(remindAt);
			onOpenChange(false);
		}
	}

	const fields = (
		<div className="flex flex-col gap-4">
			<DatePicker today={today} value={date} onValueChange={setDate} constraints={[dateOnOrAfter(today)]} />
			<TimePicker value={time} onValueChange={setTime} minuteStep={1} />
			{isPast && (
				<p className="text-center text-[15px] font-semibold text-[var(--seed-color-fg-critical)]">
					지금 이후 시각을 골라주세요
				</p>
			)}
			{hasNoChannel && (
				<Callout
					role="note"
					tone="warning"
					prefixIcon={<IconExclamationmarkCircleFill />}
					title="알림을 받을 곳이 없어요"
					description="카카오톡 알림이나 기기 알림을 켜야 이 시각에 알려드릴 수 있어요."
					linkProps={{ asChild: true, children: <NextLink href={ROUTES.SETTINGS}>알림 켜러 가기</NextLink> }}
				/>
			)}
		</div>
	);

	const footer = (
		<ResponsivePair gap="x2">
			<ActionButton type="button" variant="neutralWeak" onClick={() => onOpenChange(false)} flexGrow={1}>
				취소
			</ActionButton>
			<ActionButton type="submit" variant="brandSolid" disabled={!canSave} flexGrow={1}>
				저장
			</ActionButton>
		</ResponsivePair>
	);

	if (isTabletUp) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent title="알림 설정">
					<form onSubmit={handleSubmit} className="contents">
						<DialogBody>{fields}</DialogBody>
						<DialogFooter>{footer}</DialogFooter>
					</form>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<BottomSheetRoot open={open} onOpenChange={onOpenChange}>
			<BottomSheetContent title="알림 설정">
				<form onSubmit={handleSubmit} className="contents">
					<BottomSheetBody>{fields}</BottomSheetBody>
					<BottomSheetFooter>{footer}</BottomSheetFooter>
				</form>
			</BottomSheetContent>
		</BottomSheetRoot>
	);
}
