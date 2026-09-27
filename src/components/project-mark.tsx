import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ink = '#0B0B0B'
const lime = '#D6FF00'

// Geometric project identities from the LumenRise product mockups. These are
// artwork, so their colors stay fixed across light and dark themes.
const marks = {
  Northstar: (
    <>
      <rect width="40" height="40" fill={ink} />
      <path d="M20 7 22.6 17.4 33 20 22.6 22.6 20 33 17.4 22.6 7 20 17.4 17.4Z" fill="#fff" />
      <circle cx="20" cy="20" r="2" fill={lime} />
    </>
  ),
  Meridian: (
    <>
      <rect width="40" height="40" fill="#F0F0EC" />
      <circle cx="20" cy="20" r="11" fill={ink} />
      <path d="M20 9a11 11 0 0 1 0 22z" fill="#fff" />
      <rect x="19" y="6" width="2" height="28" fill={ink} />
    </>
  ),
  Commons: (
    <>
      <rect width="40" height="40" fill={ink} />
      <circle cx="14" cy="16" r="5" fill="#fff" />
      <circle cx="26" cy="16" r="5" fill="#fff" opacity=".55" />
      <circle cx="20" cy="26" r="5" fill="#fff" opacity=".8" />
    </>
  ),
  Harbor: (
    <>
      <rect width="40" height="40" fill="#E5E5E5" />
      <path d="M10 30V20a10 10 0 0 1 20 0v10h-5V20a5 5 0 0 0-10 0v10z" fill={ink} />
    </>
  ),
  Flowstate: (
    <>
      <rect width="40" height="40" fill={ink} />
      <path
        d="M8 16c4-4 8 4 12 0s8 4 12 0M8 22c4-4 8 4 12 0s8 4 12 0M8 28c4-4 8 4 12 0s8 4 12 0"
        stroke="#fff"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  Contour: (
    <>
      <rect width="40" height="40" fill="#fff" />
      <rect x=".5" y=".5" width="39" height="39" rx="11.5" fill="none" stroke="#E5E5E5" />
      <path d="M8 30a12 12 0 0 1 24 0M13 30a7 7 0 0 1 14 0M18 30a2 2 0 0 1 4 0" stroke={ink} strokeWidth="2.2" fill="none" />
    </>
  ),
  Aster: (
    <>
      <rect width="40" height="40" fill="#F0F0EC" />
      <path d="M20 9v22M10.5 14.5l19 11M29.5 14.5l-19 11" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  Tidewell: (
    <>
      <rect width="40" height="40" fill={ink} />
      <path d="M9 22a11 11 0 0 0 22 0z" fill={lime} />
      <rect x="9" y="17" width="22" height="2.5" fill="#fff" />
    </>
  ),
  Vessel: (
    <>
      <rect width="40" height="40" fill="#fff" />
      <rect x=".5" y=".5" width="39" height="39" rx="11.5" fill="none" stroke="#E5E5E5" />
      <path d="M10 12h20L20 30z" fill={ink} />
    </>
  ),
  Lattice: (
    <>
      <rect width="40" height="40" fill="#E5E5E5" />
      {[12, 20, 28].flatMap((x) =>
        [12, 20, 28].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={x === 20 && y === 20 ? 3.2 : 2.2} fill={ink} />
        )),
      )}
    </>
  ),
  Kiln: (
    <>
      <rect width="40" height="40" fill={ink} />
      <rect x="11" y="11" width="18" height="18" rx="3" fill="none" stroke="#fff" strokeWidth="2.4" />
      <rect x="17" y="17" width="6" height="6" fill="#fff" />
    </>
  ),
  Orbit: (
    <>
      <rect width="40" height="40" fill="#F0F0EC" />
      <ellipse cx="20" cy="20" rx="13" ry="6" fill="none" stroke={ink} strokeWidth="2.2" transform="rotate(-25 20 20)" />
      <circle cx="20" cy="20" r="4.5" fill={ink} />
    </>
  ),
} satisfies Record<string, ReactNode>

export type ProjectMarkName = keyof typeof marks

export function ProjectMark({
  name,
  size = 40,
  className,
}: {
  name: ProjectMarkName
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn('block shrink-0 overflow-hidden', className)}
      style={{ borderRadius: Math.round(size * 0.28) }}
    >
      {marks[name]}
    </svg>
  )
}
