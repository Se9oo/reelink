'use client';

import { useState } from 'react';

import { IconChevronRightSmallLine } from '@karrotmarket/react-monochrome-icon';

import { FolderTreeNode } from '@/entities/folder/model/types';

interface FolderTreeSelectProps {
	nodes: FolderTreeNode[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}

export function FolderTreeSelect({ nodes, selectedId, onSelect }: FolderTreeSelectProps) {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

	const renderNode = (node: FolderTreeNode, depth: number) => {
		const hasChildren = node.children.length > 0;
		const expanded = expandedIds.has(node.id);
		const selected = selectedId === node.id;

		return (
			<li key={node.id}>
				<div
					onClick={() => onSelect(node.id)}
					className={`flex cursor-pointer items-center gap-1 rounded-lg py-1 pr-2 ${
						selected ? 'bg-[var(--seed-color-bg-brand-weak)]' : ''
					}`}
					style={{ paddingLeft: `${8 + depth * 20}px` }}
				>
					{hasChildren ? (
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								toggle(node.id);
							}}
							className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--seed-color-fg-neutral-muted)]"
						>
							<IconChevronRightSmallLine
								size={14}
								style={{ transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
							/>
						</button>
					) : (
						<span className="h-8 w-8 shrink-0" />
					)}
					<span
						className={`text-sm ${
							selected ? 'font-bold text-[var(--seed-color-fg-brand)]' : 'text-[var(--seed-color-fg-neutral)]'
						}`}
					>
						{node.name}
					</span>
				</div>
				{hasChildren && expanded && <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>}
			</li>
		);
	};

	return (
		<ul className="max-h-48 overflow-y-auto rounded-xl border border-[var(--seed-color-stroke-neutral-subtle)] p-1.5">
			{nodes.map((node) => renderNode(node, 0))}
		</ul>
	);
}
