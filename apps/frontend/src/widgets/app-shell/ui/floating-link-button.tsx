import { IconPlusFill } from '@karrotmarket/react-monochrome-icon';
import { FloatingActionButton } from 'seed-design/ui/floating-action-button';

export function FloatingLinkButton() {
	return (
		<div className="fixed right-5 bottom-[84px] z-40 lg:bottom-5">
			<FloatingActionButton icon={<IconPlusFill />} label="링크 등록" />
		</div>
	);
}
