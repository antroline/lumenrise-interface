'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Launch } from '@/lib/data'
import { useLaunchpad } from '@/lib/launchpad'
import { Icon } from './Icon'
import { TokenMark } from './TokenMark'

export function LaunchRow({ launch }: { launch: Launch }) {
  const router = useRouter()
  const { isSignedIn, login } = useLaunchpad()
  const isUnavailable = launch.status === 'Upcoming'
  const participationAction = launch.status === 'Live' || launch.status === 'Auction'
  const destination = launch.status === 'Auction' ? `/auction/${launch.slug}` : `/launch/${launch.slug}`

  function handleAction() {
    if (participationAction && !isSignedIn) {
      void login(destination)
      return
    }
    router.push(destination)
  }

  return (
    <article className="launch-row">
      <div className="project-cell" data-label="Project">
        <TokenMark kind={launch.mark} />
        <div>
          <span className={`status status-${launch.status.toLowerCase().replace(/\s/g, '-')}`}>{launch.status}</span>
          <h3>{launch.name}</h3>
          <p className="max-w-[240px] text-[10px] font-[740] leading-[1.35] tracking-[0.08em] text-faint">
            {launch.symbol}
          </p>
          <p>{launch.description}</p>
        </div>
      </div>
      <div className="raise-cell" data-label="Raise progress">
        <p><strong>{launch.raised}</strong> <span>/ {launch.target}</span></p>
        <div className="progress-line"><span style={{ width: `${launch.progress}%` }} /></div>
        <small>{launch.progress}% committed</small>
      </div>
      <div className="timing-cell" data-label="Launch timing">
        <span>{launch.timingLabel}</span>
        <strong>{launch.timingValue}</strong>
        <small>{launch.date}</small>
      </div>
      <div className="allocation-cell" data-label="Allocation">
        <strong>{launch.allocation}</strong>
        <small>{launch.allocationNote}</small>
      </div>
      <div className="eligibility-cell" data-label="Eligibility">
        {launch.reputation ? (
          <>
            <strong className="score-chip">Score {launch.reputation}+</strong>
            <small>{isSignedIn ? 'Check your profile' : 'Log in to check'}</small>
          </>
        ) : (
          <><strong>Open access</strong><small>No score required</small></>
        )}
      </div>
      <div className="participants-cell" data-label="Participants">
        <strong>{launch.participants}</strong>
        <small>{launch.participants === '—' ? 'Not yet open' : 'participants'}</small>
      </div>
      <div className="action-cell" data-label="Action">
        <button
          type="button"
          className={participationAction ? 'button button-primary' : 'button button-secondary'}
          disabled={isUnavailable}
          onClick={handleAction}
        >
          {participationAction && !isSignedIn && <Icon name="lock" size={15} />}
          {launch.action}
        </button>
        <Link
          href={`/launch/${launch.slug}`}
          className="inline-flex items-center justify-center gap-[5px] text-[11px] font-[670] text-cobalt no-underline hover:underline hover:underline-offset-4"
        >
          View details <Icon name="arrow" size={15} />
        </Link>
      </div>
    </article>
  )
}
