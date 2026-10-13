import { notFound } from 'next/navigation'
import { StrKey } from '@stellar/stellar-sdk'
import { BondingCurvePage } from './_bonding/bonding-curve-page'
import { getLaunch } from '@/lib/data'
import { LaunchPageTemplate } from './_components/launch-page-template'
import { getLaunchContent } from './_data/launch-content'
import { API_NETWORK } from '@/app/create/_launch/transactions'

export default async function LaunchDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ network?: string }>;
}) {
  const { slug } = await params
  const { network } = await searchParams
  if (StrKey.isValidContract(slug)) return <BondingCurvePage key={network + ':' + slug} address={slug} network={network === 'public' ? 'public' : API_NETWORK} />
  const launch = getLaunch(slug)
  if (!launch) notFound()
  return <LaunchPageTemplate launch={launch} content={getLaunchContent(slug)} referenceStyle={slug === 'northstar'} />
}
