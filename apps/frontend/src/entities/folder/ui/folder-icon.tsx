import { IconGearFill } from '@karrotmarket/react-monochrome-icon';

import { IconFolderFill } from '@/shared/ui/icons/icon-folder-fill';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface FolderIconProps {
	isSystem: boolean;
	filled?: boolean;
	size: number;
	className?: string;
}

const GEAR_OFFSET = { top: -1, right: -2 };

export function FolderIcon({ isSystem, filled = false, size, className }: FolderIconProps) {
	const Icon = filled ? IconFolderFill : IconFolderLine;

	if (!isSystem) {
		return <Icon size={size} className={className} />;
	}

	const gearSize = Math.round(size * 0.55);
	const centerX = size - GEAR_OFFSET.right - gearSize / 2;
	const centerY = GEAR_OFFSET.top + gearSize / 2;
	const cutoutRadius = gearSize / 2 + 1;

	return (
		<span className={`relative inline-flex ${className ?? ''}`} aria-hidden="true">
			<Icon
				size={size}
				style={{
					maskImage: `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${cutoutRadius}px, #000 ${cutoutRadius}px)`,
				}}
			/>
			<IconGearFill size={gearSize} className="absolute" style={{ top: GEAR_OFFSET.top, right: GEAR_OFFSET.right }} />
		</span>
	);
}
