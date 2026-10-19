const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
	const diff = now.getTime() - new Date(iso).getTime();

	if (diff < MINUTE) {
		return '방금';
	}

	if (diff < HOUR) {
		return `${Math.floor(diff / MINUTE)}분 전`;
	}

	if (diff < DAY) {
		return `${Math.floor(diff / HOUR)}시간 전`;
	}

	const days = Math.floor(diff / DAY);

	if (days === 1) {
		return '어제';
	}

	if (days < 7) {
		return `${days}일 전`;
	}

	if (days < 30) {
		return `${Math.floor(days / 7)}주 전`;
	}

	if (days < 365) {
		return `${Math.min(Math.floor(days / 30), 11)}개월 전`;
	}

	return `${Math.floor(days / 365)}년 전`;
}
