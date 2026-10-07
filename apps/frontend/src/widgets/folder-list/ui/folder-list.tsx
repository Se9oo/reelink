'use client';

import { useState } from 'react';

import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import { FolderTreeItem } from '@/widgets/folder-list/ui/folder-tree-item';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

import { useToggleSet } from '@/shared/lib/use-toggle-set';

export function FolderList() {
	const { data: folders } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = useToggleSet();
	const [createTarget, setCreateTarget] = useState<{ parentId: string | null; parentName?: string } | null>(null);

	if (!folders) {
		return null;
	}

	const tree = buildFolderTree(folders);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between py-1 pl-3">
				<span className="text-sm text-[var(--seed-color-fg-neutral-muted)]">폴더</span>
				<button
					type="button"
					onClick={() => setCreateTarget({ parentId: null })}
					aria-label="새 폴더 만들기"
					className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--seed-radius-r3)]
						text-[var(--seed-color-fg-neutral-muted)] transition-colors
						hover:bg-[var(--seed-color-bg-transparent-pressed)]"
				>
					<IconPlusSmallLine size={20} />
				</button>
			</div>

			{tree.length === 0 ? (
				<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요.</p>
			) : (
				<ul>
					{tree.map((node) => (
						<FolderTreeItem
							key={node.id}
							node={node}
							expandedIds={expandedIds}
							onToggle={toggle}
							onRequestCreate={(parentId, parentName) => setCreateTarget({ parentId, parentName })}
						/>
					))}
				</ul>
			)}

			<CreateFolderModal
				open={createTarget !== null}
				onOpenChange={(open) => !open && setCreateTarget(null)}
				parentFolderId={createTarget?.parentId ?? null}
				parentFolderName={createTarget?.parentName}
				onCreated={() => {
					if (createTarget?.parentId) {
						expand(createTarget.parentId);
					}
				}}
			/>
		</div>
	);
}
