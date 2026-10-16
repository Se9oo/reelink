'use client';

import { type ReactNode, useState } from 'react';

import { IconMagnifyingglassLine, IconXmarkCircleFill } from '@karrotmarket/react-monochrome-icon';
import { useQuery } from '@tanstack/react-query';

import { useLinkActions } from '@/features/link-actions/model/use-link-actions';

import { foldersQueryOptions } from '@/entities/folder/api/get-folders';
import { buildFolderPath } from '@/entities/folder/model/build-folder-path';
import { searchLinksQueryOptions } from '@/entities/link/api/search-links';
import { LinkRow } from '@/entities/link/ui/link-row';

import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

const DEBOUNCE_MS = 300;

interface LinkSearchProps {
	children: ReactNode;
}

export function LinkSearch({ children }: LinkSearchProps) {
	const [input, setInput] = useState('');
	const query = useDebouncedValue(input.trim(), DEBOUNCE_MS);
	const searching = input.trim().length > 0;
	const resultsAreCurrent = query === input.trim();

	const { data: results } = useQuery(searchLinksQueryOptions(query));
	const { data: folders = [] } = useQuery(foldersQueryOptions());
	const { onDelete } = useLinkActions();

	return (
		<>
			<div className="px-4 pt-2 pb-2 lg:px-0">
				<div
					className="flex h-10 items-center gap-2 rounded-lg bg-[var(--seed-color-bg-neutral-weak)] pr-2 pl-3
						lg:h-[38px]"
				>
					<IconMagnifyingglassLine size={16} className="shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
					<input
						type="text"
						value={input}
						onChange={(event) => setInput(event.target.value)}
						aria-label="링크 검색"
						placeholder="URL, 키워드, 저장 이유로 검색"
						className="min-w-0 flex-1 bg-transparent text-sm text-[var(--seed-color-fg-neutral)] outline-none
							placeholder:text-[var(--seed-color-fg-neutral-muted)]"
					/>
					{searching && (
						<button
							type="button"
							onClick={() => setInput('')}
							aria-label="검색어 지우기"
							className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full
								text-[var(--seed-color-fg-neutral-muted)]"
						>
							<IconXmarkCircleFill size={18} />
						</button>
					)}
				</div>
			</div>

			{!searching ? (
				children
			) : (
				<div className="flex flex-col">
					{results && resultsAreCurrent && (
						<div className="px-4 pb-2 text-[12.5px] text-[var(--seed-color-fg-neutral-muted)] lg:px-0">
							{results.length === 0 ? '검색 결과가 없어요' : `전체 링크에서 검색 · 결과 ${results.length}개`}
						</div>
					)}
					{resultsAreCurrent &&
						results?.map((link) => (
							<LinkRow
								key={link.id}
								link={link}
								folderPath={buildFolderPath(folders, link.folderId)}
								onDelete={() => onDelete(link)}
							/>
						))}
				</div>
			)}
		</>
	);
}
