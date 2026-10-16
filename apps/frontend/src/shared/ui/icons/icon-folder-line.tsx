import type { SVGProps } from 'react';

interface IconFolderLineProps extends SVGProps<SVGSVGElement> {
	size?: number | string;
}

export function IconFolderLine({ size = 24, ...props }: IconFolderLineProps) {
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
				d="M3 17V7C3 5.62 4.12 4.5 5.5 4.5H9.17C9.83 4.5 10.44 4.83 10.81 5.38L11.69 6.62C12.06 7.17 12.67 7.5 13.33 7.5H18.5C19.88 7.5 21 8.62 21 10V17C21 18.38 19.88 19.5 18.5 19.5H5.5C4.12 19.5 3 18.38 3 17Z"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
		</svg>
	);
}
