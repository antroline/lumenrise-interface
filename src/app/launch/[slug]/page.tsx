import { notFound } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
import { BondingCurvePage } from '@/features/launches/bonding';
import { API_NETWORK } from '@/lib/stellar/network';

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
        network={network === 'public' || network === 'mainnet' ? 'public' : API_NETWORK}
      />
    );
  notFound();
}
