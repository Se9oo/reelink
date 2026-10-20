'use client';

import { IconCheckmarkLine, IconChevronDownSmallLine } from '@karrotmarket/react-monochrome-icon';
import { MenuContent, MenuGroup, MenuItem, MenuRoot, MenuTrigger } from 'seed-design/ui/menu';

import { LinkSort } from '@/entities/link/model/sort-links';

const SORT_LABELS: Record<LinkSort, string> = {
	newest: '최신순',
	oldest: '오래된순',
	name: '이름순',
};

interface LinkSortMenuProps {
	sort: LinkSort;
	onSortChange: (sort: LinkSort) => void;
}

export function LinkSortMenu({ sort, onSortChange }: LinkSortMenuProps) {
	return (
		<MenuRoot size="small">
			<MenuTrigger asChild>
				<button
					type="button"
					className="flex h-8 cursor-pointer items-center gap-0.5 rounded-lg px-2 text-[13px] font-semibold
						text-[var(--seed-color-fg-neutral-subtle)] hover:bg-[var(--seed-color-bg-neutral-weak)]"
				>
					{SORT_LABELS[sort]}
					<IconChevronDownSmallLine size={14} />
				</button>
			</MenuTrigger>
			<MenuContent>
				<MenuGroup>
					{(Object.keys(SORT_LABELS) as LinkSort[]).map((option) => (
						<MenuItem
							key={option}
							label={SORT_LABELS[option]}
							suffixIcon={option === sort ? <IconCheckmarkLine /> : undefined}
							onClick={() => onSortChange(option)}
						/>
					))}
				</MenuGroup>
			</MenuContent>
		</MenuRoot>
	);
}
