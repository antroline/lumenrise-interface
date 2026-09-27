const SIZE = 300
const CENTER = SIZE / 2
const RADIUS = 118
const RINGS = [0.25, 0.5, 0.75, 1]

function point(index: number, total: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius]
}

function ringPoints(total: number, radius: number) {
  return Array.from({ length: total }, (_, i) =>
    point(i, total, radius)
      .map((n) => n.toFixed(1))
      .join(','),
  ).join(' ')
}

/** Six-axis radar of the reputation signals; Sybil risk arrives pre-inverted as resistance. */
export function RadarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const total = values.length
  const shape = values
    .map((value, i) =>
      point(i, total, (RADIUS * value) / 100)
        .map((n) => n.toFixed(1))
        .join(','),
    )
    .join(' ')

  return (
    <svg
      viewBox={`-40 0 ${SIZE + 80} ${SIZE}`}
      role="img"
      aria-label="Radar chart of the six reputation signals"
      className="h-auto w-full max-w-[380px]"
    >
      {RINGS.map((fraction) => (
        <polygon key={fraction} points={ringPoints(total, RADIUS * fraction)} fill="none" className="stroke-border" />
      ))}
      {values.map((_, i) => {
        const [x, y] = point(i, total, RADIUS)
        return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-divider" />
      })}
      <polygon
        points={shape}
        className="fill-lime stroke-foreground"
        fillOpacity={0.55}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {values.map((value, i) => {
        const [x, y] = point(i, total, (RADIUS * value) / 100)
        return <circle key={i} cx={x} cy={y} r={3.5} className="fill-foreground" />
      })}
      {labels.map((label, i) => {
        const [x, y] = point(i, total, RADIUS + 22)
        return (
          <text key={label} x={x} y={y + 4} textAnchor="middle" fontSize={11} className="fill-muted-foreground font-mono">
            {label}
          </text>
        )
      })}
    </svg>
  )
}
