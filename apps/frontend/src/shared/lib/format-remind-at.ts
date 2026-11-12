export function formatRemindAt(value: string | Date, now: Date = new Date()) {
	const date = new Date(value);
	const hours = date.getHours();
	const period = hours < 12 ? '오전' : '오후';
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const year = date.getFullYear() === now.getFullYear() ? '' : `${date.getFullYear()}년 `;

	return `${year}${date.getMonth() + 1}월 ${date.getDate()}일 ${period} ${hours % 12 || 12}:${minutes}`;
}
