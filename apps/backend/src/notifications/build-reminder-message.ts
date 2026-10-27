const MAX_LISTED = 5;
const MAX_TITLE_LENGTH = 20;

const segmenter = new Intl.Segmenter();

/**
 * 제목을 JS 문자열 길이 20 이하로 자르고 말줄임표를 붙인다. 이모지 같은 글자는 중간에서 쪼개지 않는다.
 * @param title string
 * @returns string
 */
function truncate(title: string): string {
	if (title.length <= MAX_TITLE_LENGTH) {
		return title;
	}

	let truncated = '';
	for (const { segment } of segmenter.segment(title)) {
		if (truncated.length + segment.length > MAX_TITLE_LENGTH) {
			break;
		}
		truncated += segment;
	}

	return `${truncated}…`;
}

/**
 * 리마인드 메시지를 만든다. 제목은 최대 5개까지 나열하고 나머지는 "외 N건"으로 줄여 카카오 텍스트 제한(200자)을 넘지 않는다.
 * @param titles string[] 오래된 순으로 정렬된 링크 제목
 * @returns string
 */
export function buildReminderMessage(titles: string[]): string {
	const lines = [
		`안 본 링크 ${titles.length}개가 기다려요`,
		...titles.slice(0, MAX_LISTED).map((title) => `· ${truncate(title)}`),
	];

	if (titles.length > MAX_LISTED) {
		lines.push(`외 ${titles.length - MAX_LISTED}건은 피드에서 확인하세요`);
	}

	return lines.join('\n');
}
