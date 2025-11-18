import RealDataDashboard from '@/components/RealDataDashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function RealDataPage({ params }: PageProps) {
  // slug is the bin identifier from URL (e.g., "kantinlt1")
  const { slug } = await params;

  return <RealDataDashboard binSlug={slug} />;
}
