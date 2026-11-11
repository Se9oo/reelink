/**
 * 프론트엔드 주소에 경로를 붙여 반환한다. env는 부팅할 때 로드되고 테스트가 바꾸기도 하므로 상수가 아니라 호출할 때마다 읽는다.
 * @param path string '/feed'처럼 /로 시작하는 경로, 생략하면 주소만
 * @returns string
 */
export function frontendUrl(path = ''): string {
	return `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}${path}`;
}
