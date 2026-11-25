import type { SVGProps } from 'react';

interface IconClipboardLineProps extends SVGProps<SVGSVGElement> {
	size?: number | string;
}

export function IconClipboardLine({ size = 24, ...props }: IconClipboardLineProps) {
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
				d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="9" y="2.5" width="6" height="3.5" rx="1" stroke="currentColor" strokeWidth={2} />
		</svg>
	);
}
