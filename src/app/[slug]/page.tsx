import TrashBinDashboard from '@/components/TrashBinDashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BinDetailPage({ params }: PageProps) {
  // slug is the bin identifier from URL (e.g., "kantinlt1")
  const { slug } = await params;

  return <TrashBinDashboard binSlug={slug} />;
}
