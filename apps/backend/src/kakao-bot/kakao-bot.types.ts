/** 오픈빌더 스킬 요청 본문. 웹훅에서 읽는 필드만 정의한다. */
export interface KakaoSkillRequest {
	userRequest?: {
		utterance?: unknown;
		user?: { id?: unknown };
	};
}

export interface LinkCode {
	code: string;
	expiresAt: Date;
}

export interface LinkStatus {
	linked: boolean;
	linkedAt: Date | null;
}
