import type { SVGProps } from 'react';

interface ReelinkSymbolProps extends SVGProps<SVGSVGElement> {
	size?: number | string;
}

export function ReelinkSymbol({ size = 24, className = '', ...props }: ReelinkSymbolProps) {
	return (
		<svg viewBox="6 8 52 48" width={size} height={size} aria-hidden="true" className={className} {...props}>
			<rect x="6" y="14" width="34" height="20" rx="10" fill="#007fff" transform="rotate(-18 23 24)" />
			<rect x="24" y="30" width="34" height="20" rx="10" fill="#66b0ff" transform="rotate(-18 41 40)" />
		</svg>
	);
}

export function ReelinkWordmark({ className = '' }: { className?: string }) {
	return (
		<span className={`font-extrabold tracking-[-0.04em] ${className}`}>
			R<span className="text-[#007fff]">ee</span>link
		</span>
	);
}
