export function greetingFor(hour: number) {
	if (hour >= 5 && hour <= 11) {
		return '좋은 아침이에요';
	} else if (hour >= 12 && hour <= 17) {
		return '좋은 오후예요';
	} else if (hour >= 18 && hour <= 21) {
		return '좋은 저녁이에요';
	} else if (hour >= 22 || hour <= 4) {
		return '늦은 시간이네요';
	}

	return '';
}

export function subGreetingFor(unviewedCount: number) {
	if (unviewedCount === 0) {
		return '새로 저장한 링크를 둘러볼까요?';
	}

	const MAX_UNVIEWED_COUNT = 3;

	let count = unviewedCount;

	if (unviewedCount > MAX_UNVIEWED_COUNT) {
		count = MAX_UNVIEWED_COUNT;
	}

	return `오늘은 오래된 링크 ${count}개만 정리해볼까요?`;
}

export function praiseFor({ viewed, viewedLastWeek }: { viewed: number; viewedLastWeek: number }) {
	if (viewed > viewedLastWeek) {
		return `저번 주보다 ${viewed - viewedLastWeek}개 더 봤어요.`;
	} else {
		return null;
	}
}
