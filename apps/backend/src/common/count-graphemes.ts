const segmenter = new Intl.Segmenter();

/**
 * 사람이 보는 글자 단위로 길이를 센다. 이모지나 결합 문자도 한 글자로 센다.
 * @param value string
 * @returns number
 */
export function countGraphemes(value: string): number {
	return [...segmenter.segment(value)].length;
}
