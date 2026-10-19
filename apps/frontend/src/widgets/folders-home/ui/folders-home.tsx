'use client';

import { FolderTreeScreen } from '@/widgets/folder-tree-screen/ui/folder-tree-screen';

import { LinkSearch } from '@/features/search-links/ui/link-search';

export function FoldersHome() {
	return (
		<div className="flex min-h-full flex-col pt-2 md:bg-[var(--app-bg-canvas)] lg:px-10 lg:pt-7">
			<h1 className="hidden pb-4 text-2xl font-bold text-[var(--seed-color-fg-neutral)] lg:block">링크</h1>
			<LinkSearch>
				<div className="lg:hidden">
					<FolderTreeScreen />
				</div>
				<p className="hidden p-10 text-center text-sm text-[var(--seed-color-fg-neutral-muted)] lg:block">
					왼쪽에서 폴더를 선택하면 링크를 볼 수 있어요
				</p>
			</LinkSearch>
		</div>
	);
}
