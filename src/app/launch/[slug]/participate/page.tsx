import { notFound } from 'next/navigation'
import { getLaunch } from '@/lib/data'
import { getLaunchContent } from '../_data/launch-content'
import { ParticipationView } from './participation-view'

export default async function ParticipatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const launch = getLaunch(slug)
  if (!launch) notFound()

  return <ParticipationView launch={launch} content={getLaunchContent(slug)} />
}
