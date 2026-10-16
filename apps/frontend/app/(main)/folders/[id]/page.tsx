import { FolderDetailView } from '@/widgets/folder-detail/ui/folder-detail-view';

export default async function FolderDetailPage({ params }: PageProps<'/folders/[id]'>) {
	const { id } = await params;

	return <FolderDetailView folderId={id} />;
}
