'use client';

import type { ReactNode } from 'react';

import NextLink from 'next/link';

import { IconChevronLeftLine, IconChevronRightSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from 'seed-design/ui/action-button';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';
import { LinkSearch } from '@/features/search-links/ui/link-search';
import { useLinkSort } from '@/features/sort-links/model/use-link-sort';
import { LinkSortMenu } from '@/features/sort-links/ui/link-sort-menu';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { folderLinksQueryOptions } from '@/entities/link/api/get-folder-links';
import { sortLinks } from '@/entities/link/model/sort-links';
import { LinkRow } from '@/entities/link/ui/link-row';

import { folderDetailPath, ROUTES } from '@/shared/config/routes';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface FolderDetailViewProps {
	folderId: string;
}

export function FolderDetailView({ folderId }: FolderDetailViewProps) {
	const { data: folders } = useQuery(foldersQueryOptions());
	const { data: links } = useQuery(folderLinksQueryOptions(folderId));
	const { onDelete, onMove, onEdit, onTogglePin } = useLinkActions();
	const { sort, setSort } = useLinkSort();

	if (!folders) {
		return null;
	}

	const folder = folders.find((item) => item.id === folderId);

	if (!folder) {
		return (
			<div className="flex min-h-full flex-col items-center justify-center gap-4 p-10 text-center">
				<p className="text-[15px] text-[var(--seed-color-fg-neutral-muted)]">폴더를 찾을 수 없어요</p>
				<ActionButton asChild variant="brandSolid" size="medium">
					<NextLink href={ROUTES.FOLDERS}>폴더 목록으로</NextLink>
				</ActionButton>
			</div>
		);
	}

	const subfolders = folders
		.filter((item) => item.parentFolderId === folderId)
		.sort((a, b) => a.sortOrder - b.sortOrder);
	const linkCount = links?.length ?? 0;
	const childCountById = new Map<string, number>();

	for (const item of folders) {
		if (item.parentFolderId) {
			childCountById.set(item.parentFolderId, (childCountById.get(item.parentFolderId) ?? 0) + 1);
		}
	}

	const isEmpty = links !== undefined && subfolders.length === 0 && linkCount === 0;

	return (
		<div className="flex min-h-full flex-col pb-32 md:bg-[var(--app-bg-canvas)] lg:px-10 lg:pt-7">
			<div className="flex items-center gap-1 pt-3 pr-3 pl-2 lg:flex-col lg:items-start lg:gap-1.5 lg:p-0 lg:pb-4">
				<NextLink
					href={ROUTES.FOLDERS}
					aria-label="뒤로 가기"
					className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--seed-color-fg-neutral)]
						lg:hidden"
				>
					<IconChevronLeftLine size={22} />
				</NextLink>
				<div className="hidden text-[13px] text-[var(--seed-color-fg-neutral-muted)] lg:block">
					링크 <span className="px-1">/</span> {buildFolderPath(folders, folderId)}
				</div>
				<div className="flex min-w-0 flex-col">
					<h1 className="truncate text-[17px] font-bold text-[var(--seed-color-fg-neutral)] lg:text-2xl">
						{folder.name}
					</h1>
					<div className="text-xs text-[var(--seed-color-fg-neutral-muted)] lg:hidden">
						폴더 {subfolders.length} · 링크 {linkCount}
					</div>
				</div>
			</div>

			<LinkSearch>
				{isEmpty && (
					<p className="p-10 text-center text-sm text-[var(--seed-color-fg-neutral-muted)]">
						이 폴더엔 아직 링크가 없어요
					</p>
				)}

				{subfolders.length > 0 && (
					<Section>
						<SectionHeader>
							<SectionLabel>하위 폴더 {subfolders.length}</SectionLabel>
						</SectionHeader>
						<div className="flex flex-col md:grid md:grid-cols-2 md:gap-2 2xl:grid-cols-3">
							{subfolders.map((subfolder) => (
								<NextLink
									key={subfolder.id}
									href={folderDetailPath(subfolder.id)}
									className="flex items-center gap-3 px-4 py-2.5 md:rounded-[14px] md:border
										md:border-[var(--seed-color-stroke-neutral-subtle)] md:bg-[var(--seed-color-bg-layer-default)]
										md:px-3.5 md:py-3 md:transition-colors md:hover:border-[var(--seed-color-stroke-neutral-muted)]"
								>
									<span
										className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]
											bg-[var(--seed-color-bg-brand-weak)] text-[var(--seed-color-fg-brand)]"
									>
										<IconFolderLine size={20} />
									</span>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-[15px] font-semibold text-[var(--seed-color-fg-neutral)]">
											{subfolder.name}
										</span>
										{(childCountById.get(subfolder.id) ?? 0) > 0 && (
											<span className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
												하위 폴더 {childCountById.get(subfolder.id)}
											</span>
										)}
									</span>
									<IconChevronRightSmallLine size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
								</NextLink>
							))}
						</div>
					</Section>
				)}

				{subfolders.length > 0 && linkCount > 0 && <div className="my-2 h-2 bg-[var(--app-bg-canvas)] md:hidden" />}

				{links && links.length > 0 && (
					<Section>
						<SectionHeader>
							<SectionLabel>링크 {linkCount}</SectionLabel>
							{links.length > 1 && <LinkSortMenu sort={sort} onSortChange={setSort} />}
						</SectionHeader>
						<div className="flex flex-col md:grid md:grid-cols-2 md:gap-2 2xl:grid-cols-3">
							{sortLinks(links, sort).map((link) => (
								<LinkRow
									key={link.id}
									link={link}
									onMove={() => onMove(link)}
									onEdit={() => onEdit(link)}
									onDelete={() => onDelete(link)}
									onTogglePin={() => onTogglePin(link)}
								/>
							))}
						</div>
					</Section>
				)}
			</LinkSearch>
		</div>
	);
}

function Section({ children }: { children: ReactNode }) {
	return <section className="md:mx-4 md:mt-5 lg:mx-0">{children}</section>;
}

function SectionHeader({ children }: { children: ReactNode }) {
	return <div className="flex h-9 items-center justify-between pr-2 pl-4 md:mb-2 md:h-8 md:px-0">{children}</div>;
}

function SectionLabel({ children }: { children: ReactNode }) {
	return <span className="text-[13px] font-semibold text-[var(--seed-color-fg-neutral-muted)]">{children}</span>;
}
