import type { DatePickerDate, TimePickerValue } from '@seed-design/react';

export function remindAtToParts(date: Date): { date: DatePickerDate; time: TimePickerValue } {
	return {
		date: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
		time: { hour: date.getHours(), minute: date.getMinutes() },
	};
}

export function partsToRemindAt(date: DatePickerDate, time: TimePickerValue) {
	return new Date(date.year, date.month - 1, date.day, time.hour, time.minute);
}

export function nextWholeHour(now: Date) {
	return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
}
