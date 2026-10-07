'use client';

import { useState } from 'react';

import { IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import { FolderTreeItem } from '@/widgets/folder-list/ui/folder-tree-item';

import { CreateFolderModal } from '@/features/create-folder/ui/create-folder-modal';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';

export function FolderList() {
	const { data: folders } = useQuery(foldersQueryOptions());
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [createTarget, setCreateTarget] = useState<{ parentId: string | null; parentName?: string } | null>(null);

	const toggle = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);

			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}

			return next;
		});
	};

	if (!folders) {
		return null;
	}

	const tree = buildFolderTree(folders);

	return (
		<div className="flex flex-col gap-1">
			<button
				type="button"
				onClick={() => setCreateTarget({ parentId: null })}
				className="flex items-center gap-1 self-start px-2 py-1 text-sm font-bold text-[var(--seed-color-fg-brand)]"
			>
				<IconPlusSmallLine size={16} />새 폴더
			</button>

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
						setExpandedIds((prev) => new Set(prev).add(createTarget.parentId as string));
					}
				}}
			/>
		</div>
	);
}
