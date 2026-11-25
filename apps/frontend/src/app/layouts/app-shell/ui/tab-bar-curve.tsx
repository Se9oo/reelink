interface TabBarCurveProps {
	className?: string;
}

export function TabBarCurve({ className }: TabBarCurveProps) {
	return (
		<svg
			width="140"
			height="23"
			viewBox="0 0 140 23"
			aria-hidden="true"
			className={`drop-shadow-[0_-2px_5px_rgb(0_0_0/0.06)] ${className ?? ''}`}
		>
			<path
				d="M0 23 V22 C28 22 34 0 70 0 C106 0 112 22 140 22 V23 Z"
				className="fill-[var(--seed-color-bg-layer-default)]"
			/>
		</svg>
	);
}
