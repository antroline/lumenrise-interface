import { notFound } from 'next/navigation';
import { isLaunchSlug } from '@/lib/launch-slug';
import { BondingCurvePage } from '@/features/launches/bonding';

export default async function LaunchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ network?: string }>;
}) {
  const { slug } = await params;
  const { network } = await searchParams;
  if (isLaunchSlug(slug))
    return (
      <BondingCurvePage
        key={network + ':' + slug}
        slug={slug}

      />
    );
  notFound();
}
