import type { SVGProps } from 'react';

interface IconLinkLineProps extends SVGProps<SVGSVGElement> {
	size?: number | string;
}

export function IconLinkLine({ size = 24, ...props }: IconLinkLineProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			data-seed-icon="true"
			width={size}
			height={size}
			aria-hidden="true"
			{...props}
		>
			<path
				d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
