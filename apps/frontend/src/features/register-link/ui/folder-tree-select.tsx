'use client';

import { useState } from 'react';

import { IconChevronRightSmallLine, IconPlusSmallLine } from '@karrotmarket/react-monochrome-icon';

import { FolderTreeNode } from '@/entities/folder/model/types';
import { CreateFolderModal } from '@/entities/folder/ui/create-folder-modal';

import { useToggleSet } from '@/shared/lib/use-toggle-set';
import { IconFolderFill } from '@/shared/ui/icons/icon-folder-fill';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface FolderTreeSelectProps {
	nodes: FolderTreeNode[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	disabledId?: string;
}

export function FolderTreeSelect({ nodes, selectedId, onSelect, disabledId }: FolderTreeSelectProps) {
	const { ids: expandedIds, toggle } = useToggleSet();
	const [creating, setCreating] = useState(false);
	// CreateFolderModal 자체를 처음 열기 전까지 트리에 안 넣음 — Dialog.Positioner는 닫혀있어도
	// DOM에 항상 존재해서, 미리 렌더링해두면 바깥(링크 등록) 다이얼로그가 열릴 때 찍는 hideOthers
	// 스냅샷에 이 빈 Positioner가 걸려 aria-hidden이 영구히 박히는 문제가 있었음
	const [hasOpenedCreateModal, setHasOpenedCreateModal] = useState(false);

	const renderNode = (node: FolderTreeNode, depth: number) => {
		const hasChildren = node.children.length > 0;
		const expanded = expandedIds.has(node.id);
		const selected = selectedId === node.id;
		const disabled = disabledId === node.id;

		return (
			<li key={node.id}>
				<div
					onClick={disabled ? undefined : () => onSelect(node.id)}
					aria-disabled={disabled || undefined}
					className={`flex h-8 items-center rounded-lg pr-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
						selected ? 'bg-[var(--seed-color-bg-brand-weak)]' : ''
					}`}
					style={{ paddingLeft: `${depth * 12}px` }}
				>
					{hasChildren ? (
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								toggle(node.id);
							}}
							aria-label={expanded ? `${node.name} 폴더 접기` : `${node.name} 폴더 펼치기`}
							className={`mx-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg
								text-[var(--seed-color-fg-neutral-muted)] ${
									selected
										? 'hover:bg-[var(--seed-color-bg-brand-weak-pressed)]'
										: 'hover:bg-[var(--seed-color-bg-neutral-weak-pressed)]'
								}`}
						>
							<IconChevronRightSmallLine
								size={16}
								style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
							/>
						</button>
					) : (
						<span className="mx-1 h-6 w-6 shrink-0" />
					)}
					{selected ? (
						<IconFolderFill size={16} className="mr-1.5 shrink-0 text-[var(--seed-color-fg-brand)]" />
					) : (
						<IconFolderLine size={16} className="mr-1.5 shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
					)}
					<span
						className={`text-sm ${
							selected
								? 'font-bold text-[var(--seed-color-fg-brand)]'
								: disabled
									? 'text-[var(--seed-color-fg-neutral-muted)]'
									: 'text-[var(--seed-color-fg-neutral)]'
							}`}
					>
						{node.name}
					</span>
					{disabled && <span className="ml-2 text-xs text-[var(--seed-color-fg-neutral-muted)]">현재 폴더</span>}
				</div>
				{hasChildren && expanded && <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
			</li>
		);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<span className="text-base font-medium text-[var(--seed-color-fg-neutral)]">폴더</span>
				<button
					type="button"
					onClick={() => {
						setHasOpenedCreateModal(true);
						setCreating(true);
					}}
					className="flex cursor-pointer items-center gap-1 text-sm font-bold text-[var(--seed-color-fg-brand)]"
				>
					<IconPlusSmallLine size={16} />새 폴더
				</button>
			</div>
			<ul className="max-h-48 overflow-y-auto rounded-xl border border-[var(--seed-color-stroke-neutral-subtle)] p-1.5">
				{nodes.map((node) => renderNode(node, 0))}
			</ul>
			{hasOpenedCreateModal && (
				<CreateFolderModal
					open={creating}
					onOpenChange={setCreating}
					parentFolderId={selectedId}
					onCreated={(folder) => onSelect(folder.id)}
				/>
			)}
		</div>
	);
}
