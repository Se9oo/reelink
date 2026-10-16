'use client';

import NextLink from 'next/link';

import { IconChevronRightSmallLine, IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { overlay } from 'overlay-kit';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderTree } from '@/entities/folder/model/build-folder-tree';
import { FolderTreeNode } from '@/entities/folder/model/types';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

import { folderDetailPath } from '@/shared/config/routes';
import { usePersistedToggleSet } from '@/shared/lib/use-toggle-set';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

const INDENT_WIDTH = 16;

export function FolderTreeScreen() {
	const { data: folders } = useQuery(foldersQueryOptions());
	const { ids: expandedIds, toggle, add: expand } = usePersistedToggleSet('mobile-folder-expanded');

	if (!folders) {
		return null;
	}

	function openCreateDialog(parentId: string | null, parentName?: string) {
		overlay.open(({ isOpen, close }) => (
			<CreateFolderModal
				open={isOpen}
				onOpenChange={(open) => !open && close()}
				parentFolderId={parentId}
				parentFolderName={parentName}
				onCreated={() => {
					if (parentId) {
						expand(parentId);
					}
				}}
			/>
		));
	}

	function renderNode(node: FolderTreeNode, depth: number) {
		const hasChildren = node.children.length > 0;
		const expanded = expandedIds.has(node.id);

		return (
			<li key={node.id}>
				<div className="flex h-11 items-center rounded-lg pr-1" style={{ paddingLeft: `${depth * INDENT_WIDTH}px` }}>
					{hasChildren ? (
						<button
							type="button"
							onClick={() => toggle(node.id)}
							aria-label={expanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
							className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg
								text-[var(--seed-color-fg-neutral-muted)]"
						>
							<IconChevronRightSmallLine
								size={16}
								style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
							/>
						</button>
					) : (
						<span className="h-8 w-8 shrink-0" />
					)}
					<NextLink href={folderDetailPath(node.id)} className="flex h-11 min-w-0 flex-1 items-center gap-2">
						<IconFolderLine size={18} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
						<span className="truncate text-[15px] text-[var(--seed-color-fg-neutral)]">{node.name}</span>
						{hasChildren && (
							<span className="ml-auto shrink-0 pl-2 text-xs text-[var(--seed-color-fg-neutral-muted)]">
								하위 폴더 {node.children.length}
							</span>
						)}
					</NextLink>
					<button
						type="button"
						onClick={() => openCreateDialog(node.id, node.name)}
						aria-label={`${node.name} 폴더 안에 새 폴더 만들기`}
						className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg
							text-[var(--seed-color-fg-neutral-muted)]"
					>
						<IconPlusSmallLine size={20} />
					</button>
				</div>
				{hasChildren && expanded && <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
			</li>
		);
	}

	const tree = buildFolderTree(folders);

	return (
		<div className="flex flex-col px-2 pb-32">
			<button
				type="button"
				onClick={() => openCreateDialog(null)}
				className="flex h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold
					text-[var(--seed-color-fg-brand)]"
			>
				<IconPlusSmallLine size={20} />새 폴더
			</button>

			{tree.length === 0 ? (
				<p className="p-6 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">아직 만든 폴더가 없어요</p>
			) : (
				<ul>{tree.map((node) => renderNode(node, 0))}</ul>
			)}
		</div>
	);
}
