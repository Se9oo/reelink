import { extractSharedUrl } from '@/views/share/model/extract-shared-url';
import { ShareScreen } from '@/views/share/ui/share-screen';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function SharePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
	const { url, text, title } = await searchParams;

	return <ShareScreen sharedUrl={extractSharedUrl({ url: first(url), text: first(text), title: first(title) })} />;
}
