import { CoordinateField } from '@/components/visual-system'

// Geometry is authored in a 560×400 viewBox; HTML labels use the same coordinates as percentages.
const CORE = { x: 420, y: 200 }
const RINGS = [96, 64, 32]

const SIGNALS = [
  { label: 'On-chain Activity', y: 80, path: 'M16 80 H180 C250 80 310 90 352.1 132.1 L420 200' },
  { label: 'Ecosystem Contributions', y: 200, path: 'M16 200 H420' },
  { label: 'Connected Accounts', y: 320, path: 'M16 320 H180 C250 320 310 310 352.1 267.9 L420 200' },
]

const DELAYS = ['0s', '3s', '6s']

export function ReputationSignalMap() {
  return (
    <figure className="relative isolate m-0 w-full">
      <CoordinateField className="-inset-y-8 inset-x-0 sm:-inset-x-6 -z-10 opacity-45 [mask-image:radial-gradient(ellipse_at_70%_50%,#000_20%,transparent_70%)]" />
      <figcaption className="sr-only">
        On-chain activity, ecosystem contributions and connected accounts each contribute a separate dimension to a reputation profile.
      </figcaption>
      <div aria-hidden="true" className="relative aspect-[560/400] w-full">
        <svg viewBox="0 0 560 400" className="absolute inset-0 size-full overflow-visible" fill="none">
          {RINGS.map((r, index) => (
            <circle
              key={r}
              cx={CORE.x}
              cy={CORE.y}
              r={r}
              className={index === 0 ? 'stroke-border' : 'stroke-divider'}
              strokeDasharray={index === 0 ? undefined : '2 4'}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {SIGNALS.map((signal, index) => (
            <g key={signal.label}>
              <path d={signal.path} className="stroke-muted-foreground/45" vectorEffect="non-scaling-stroke" />
              <path
                d={signal.path}
                pathLength={100}
                strokeDasharray="8 92"
                strokeLinecap="round"
                strokeWidth={2}
                className="reputation-signal-pulse stroke-foreground motion-reduce:hidden"
                style={{ animationDelay: DELAYS[index] }}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={16} cy={signal.y} r={5} className="fill-background stroke-foreground" vectorEffect="non-scaling-stroke" />
              <circle
                cx={16}
                cy={signal.y}
                r={5}
                className="reputation-signal-source fill-foreground opacity-0 motion-reduce:hidden"
                style={{ animationDelay: DELAYS[index] }}
              />
            </g>
          ))}

          {DELAYS.map((delay) => (
            <circle
              key={delay}
              cx={CORE.x}
              cy={CORE.y}
              r={14}
              className="reputation-signal-arrival stroke-lime opacity-0 motion-reduce:hidden"
              strokeWidth={2}
              style={{ animationDelay: delay }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <circle cx={CORE.x} cy={CORE.y} r={8} className="fill-lime stroke-ink" vectorEffect="non-scaling-stroke" />
        </svg>

        {SIGNALS.map((signal) => (
          <span
            key={signal.label}
            className="absolute left-[calc(16/560*100%)] -translate-y-[calc(100%+6px)] pl-0.5 text-meta font-semibold sm:-translate-y-[calc(100%+8px)] whitespace-nowrap sm:text-ui"
            style={{ top: `${(signal.y / 400) * 100}%` }}
          >
            {signal.label}
          </span>
        ))}

        <span className="absolute top-[calc((200+96)/400*100%)] left-[75%] mt-3 -translate-x-1/2 text-center whitespace-nowrap">
          <span className="block text-ui font-semibold sm:text-title">Reputation Profile</span>
          <span className="caps mt-1 block">Multidimensional</span>
        </span>
      </div>
    </figure>
  )
}
