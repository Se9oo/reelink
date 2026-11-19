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

const MAX_SUGGESTED_COUNT = 3;

export function subGreetingFor({ staleCount, unviewedCount }: { staleCount: number; unviewedCount: number }) {
	if (staleCount > 0) {
		return `오래 쌓인 링크 ${staleCount}개부터 정리해볼까요?`;
	}

	if (unviewedCount > 0) {
		return `안 본 링크 ${Math.min(unviewedCount, MAX_SUGGESTED_COUNT)}개만 먼저 볼까요?`;
	}

	return '다 봤어요! 새로 본 링크를 저장해보세요';
}
