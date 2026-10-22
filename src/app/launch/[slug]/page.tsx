import { notFound } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
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
  if (StrKey.isValidContract(slug))
    return (
      <BondingCurvePage
        key={network + ':' + slug}
        address={slug}

      />
    );
  notFound();
}
