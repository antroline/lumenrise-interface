import { cn } from '@/lib/utils'

const palettes = [
  ['#0B0B0B', '#E5E5E5'],
  ['#2E2E2C', '#F0F0EC'],
  ['#5E5E5A', '#E5E5E5'],
  ['#0B0B0B', '#F0F0EC'],
] as const

function hash(seed: string) {
  let h = 2166136261
  for (const char of seed) {
    h ^= char.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function cellsFor(seed: string) {
  let h = hash(seed)
  const next = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 1000) / 1000
  }
  const cells: Array<[number, number]> = []
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (next() > 0.5) {
        cells.push([x, y])
        if (x < 2) cells.push([4 - x, y])
      }
    }
  }
  return cells
}

/** Deterministic mirrored identicon for a Stellar address or profile seed. */
export function Blockie({
  seed,
  size = 28,
  radius = 7,
  className,
}: {
  seed: string
  size?: number
  radius?: number
  className?: string
}) {
  const [fg, bg] = palettes[hash(`${seed}p`) % palettes.length]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={cn('block shrink-0', className)}
      style={{ borderRadius: radius }}
    >
      <rect width="5" height="5" fill={bg} />
      <g fill={fg}>
        {cellsFor(seed).map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ))}
      </g>
    </svg>
  )
}
