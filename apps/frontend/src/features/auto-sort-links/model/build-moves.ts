import { AutoSortSuggestion, LinkMove } from '@/entities/link/api/auto-sort';

export interface AutoSortRow {
	linkId: string;
	folderId: string | null;
	source: LinkMove['source'];
	checked: boolean;
}

export function toRows(suggestions: AutoSortSuggestion['suggestions']): AutoSortRow[] {
	return suggestions.map(({ linkId, folderId }) => ({ linkId, folderId, source: 'ai', checked: folderId !== null }));
}

export function buildMoves(rows: AutoSortRow[]): LinkMove[] {
	return rows
		.filter((row): row is AutoSortRow & { folderId: string } => row.checked && row.folderId !== null)
		.map(({ linkId, folderId, source }) => ({ linkId, folderId, source }));
}
