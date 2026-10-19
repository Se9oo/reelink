export function getActivatorClientY(event: Event): number | null {
	if ('clientY' in event) {
		return (event as MouseEvent).clientY;
	}

	if ('touches' in event) {
		return (event as TouchEvent).touches[0]?.clientY ?? null;
	}

	return null;
}
