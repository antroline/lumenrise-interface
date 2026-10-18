import { notFound } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
import { BondingCurvePage } from '@/features/launches/bonding';
import { PreviewTradingLaunch } from '@/features/launches/components/preview-trading-launch';
import { getLaunch, getTradingToken } from '@/lib/data';
import { LaunchPageTemplate } from '@/features/launches/components/launch-page-template';
import { getLaunchContent } from '@/features/launches/data/launch-content';
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
  if (getTradingToken(slug)) return <PreviewTradingLaunch slug={slug} />;
  const launch = getLaunch(slug);
  if (!launch) notFound();
  return (
    <LaunchPageTemplate
      launch={launch}
      content={getLaunchContent(slug)}
      referenceStyle={slug === 'northstar'}
    />
  );
}
