const HOST_COLORS = ['#2f6f5e', '#3a3d44', '#5b4b8a', '#8a4b5b', '#2f5a8a', '#7a5a2f'];

export function hostColor(host: string) {
	const sum = [...host].reduce((total, char) => total + char.charCodeAt(0), 0);

	return HOST_COLORS[sum % HOST_COLORS.length];
}
