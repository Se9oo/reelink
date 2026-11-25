interface TabBarCurveProps {
	className?: string;
}

export function TabBarCurve({ className }: TabBarCurveProps) {
	return (
		<svg width="140" height="23" viewBox="0 0 140 23" aria-hidden="true" className={className}>
			<path
				d="M0 23 V22 C28 22 34 0 70 0 C106 0 112 22 140 22 V23 Z"
				className="fill-[var(--seed-color-bg-layer-default)]"
			/>
			<path
				d="M0 22.5 C28 22.5 34 0.5 70 0.5 C106 0.5 112 22.5 140 22.5"
				fill="none"
				className="stroke-[var(--seed-color-stroke-neutral-subtle)]"
			/>
		</svg>
	);
}
