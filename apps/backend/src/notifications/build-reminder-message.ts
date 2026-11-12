const MAX_LISTED = 5;
const MAX_TITLE_LENGTH = 20;
const MAX_ALARM_TITLE_LENGTH = 60;
const MAX_ALARM_REASON_LENGTH = 80;

const segmenter = new Intl.Segmenter();

/**
 * 제목을 JS 문자열 길이 max 이하로 자르고 말줄임표를 붙인다. 이모지 같은 글자는 중간에서 쪼개지 않는다.
 * @param title string
 * @param max number
 * @returns string
 */
function truncate(title: string, max = MAX_TITLE_LENGTH): string {
	if (title.length <= max) {
		return title;
	}

	let truncated = '';
	for (const { segment } of segmenter.segment(title)) {
		if (truncated.length + segment.length > max) {
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

/**
 * 링크별 알림 메시지를 만든다. 제목 60자, 저장 이유 80자로 잘라 카카오 텍스트 제한(200자)을 넘지 않는다.
 * @param title string 링크 제목(없으면 호스트명)
 * @param savedReason string | null
 * @returns string
 */
export function buildLinkAlarmMessage(title: string, savedReason: string | null): string {
	const lines = ['지정한 알림 시간이에요.', truncate(title, MAX_ALARM_TITLE_LENGTH)];

	if (savedReason) {
		lines.push(truncate(savedReason, MAX_ALARM_REASON_LENGTH));
	}

	return lines.join('\n');
}
