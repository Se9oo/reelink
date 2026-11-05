export interface LinkCode {
	code: string;
	expiresAt: string;
}

export interface LinkStatus {
	linked: boolean;
	linkedAt: string | null;
}
