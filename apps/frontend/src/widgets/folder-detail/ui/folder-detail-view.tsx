'use client';

import NextLink from 'next/link';

import { IconChevronLeftLine, IconChevronRightSmallLine } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';
import { LinkSearch } from '@/features/search-links/ui/link-search';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { folderLinksQueryOptions } from '@/entities/link/api/get-folder-links';
import { LinkRow } from '@/entities/link/ui/link-row';

import { folderDetailPath, ROUTES } from '@/shared/config/routes';
import { IconFolderLine } from '@/shared/ui/icons/icon-folder-line';

interface FolderDetailViewProps {
	folderId: string;
}

export function FolderDetailView({ folderId }: FolderDetailViewProps) {
	const { data: folders } = useQuery(foldersQueryOptions());
	const { data: links } = useQuery(folderLinksQueryOptions(folderId));
	const { onDelete, onMove } = useLinkActions();

	if (!folders) {
		return null;
	}

	const folder = folders.find((item) => item.id === folderId);

	if (!folder) {
		return (
			<div className="flex flex-col items-center gap-3 p-10 text-center">
				<p className="text-sm text-[var(--seed-color-fg-neutral-muted)]">폴더를 찾을 수 없어요</p>
				<NextLink href={ROUTES.FOLDERS} className="text-sm font-semibold text-[var(--seed-color-fg-brand)]">
					폴더 목록으로
				</NextLink>
			</div>
		);
	}

	const subfolders = folders
		.filter((item) => item.parentFolderId === folderId)
		.sort((a, b) => a.sortOrder - b.sortOrder);
	const linkCount = links?.length ?? 0;
	const isEmpty = links !== undefined && subfolders.length === 0 && linkCount === 0;

	return (
		<div className="flex flex-col pb-32 lg:px-10 lg:pt-7">
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
					<div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-2">
						{subfolders.map((subfolder) => (
							<NextLink
								key={subfolder.id}
								href={folderDetailPath(subfolder.id)}
								className="flex h-14 items-center gap-3 px-4 lg:rounded-xl lg:border
									lg:border-[var(--seed-color-stroke-neutral-subtle)]"
							>
								<IconFolderLine size={20} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
								<span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--seed-color-fg-neutral)]">
									{subfolder.name}
								</span>
								<IconChevronRightSmallLine size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
							</NextLink>
						))}
					</div>
				)}

				{subfolders.length > 0 && linkCount > 0 && (
					<div className="my-2 h-2 bg-[var(--seed-color-bg-neutral-weak)] lg:hidden" />
				)}

				{links && links.length > 0 && (
					<div
						className="flex flex-col lg:mt-5 lg:rounded-xl lg:border
							lg:border-[var(--seed-color-stroke-neutral-subtle)]"
					>
						{links.map((link) => (
							<LinkRow key={link.id} link={link} onMove={() => onMove(link)} onDelete={() => onDelete(link)} />
						))}
					</div>
				)}
			</LinkSearch>
		</div>
	);
}
