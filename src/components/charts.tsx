import { useId } from 'react'
import { areaPath, linePath, scalePoints } from '@/lib/chart'
import { cn } from '@/lib/utils'

export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
}: {
  data: number[]
  width?: number
  height?: number
  className?: string
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={cn('inline-block text-foreground', className)}
    >
      <path
        d={linePath(scalePoints(data, width, height, 2))}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}

const AXIS_TEXT = 'fill-faint font-mono text-[10.5px]'

export function LineChart({
  data,
  width = 680,
  height = 260,
  min,
  max,
  yTicks = [],
  xLabels = [],
  formatTick = String,
  fill = true,
  marker = true,
  band,
  label,
  className,
}: {
  data: number[]
  width?: number
  height?: number
  min?: number
  max?: number
  yTicks?: number[]
  xLabels?: string[]
  formatTick?: (value: number) => string
  fill?: boolean
  marker?: boolean
  /** Highlighted value range, drawn as a lime band. */
  band?: [number, number]
  /** Accessible summary of what the chart shows. */
  label: string
  className?: string
}) {
  // useId output may contain characters that are invalid inside url(#…).
  const gradientId = `line-fill-${useId().replace(/[^\w-]/g, '')}`
  const padRight = 48
  const padTop = 10
  const padBottom = 26
  const innerWidth = width - padRight
  const innerHeight = height - padTop - padBottom
  const lo = min ?? Math.min(...data)
  const hi = max ?? Math.max(...data)
  const y = (value: number) => padTop + innerHeight - ((value - lo) / (hi - lo || 1)) * innerHeight
  const points = data.map((value, index): [number, number] => [(index / (data.length - 1)) * innerWidth, y(value)])
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn('block h-auto w-full overflow-visible', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-lime)" stopOpacity={0.55} />
          <stop offset="1" stopColor="var(--color-lime)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={0} x2={innerWidth} y1={y(tick)} y2={y(tick)} className="stroke-divider" />
          <text x={innerWidth + 10} y={y(tick) + 4} className={AXIS_TEXT}>
            {formatTick(tick)}
          </text>
        </g>
      ))}
      {band && (
        <rect
          x={0}
          y={y(band[1])}
          width={innerWidth}
          height={y(band[0]) - y(band[1])}
          className="fill-lime"
          opacity={0.35}
        />
      )}
      {fill && <path d={areaPath(points, padTop + innerHeight)} fill={`url(#${gradientId})`} />}
      <path d={linePath(points)} fill="none" className="stroke-foreground" strokeWidth={1.8} strokeLinejoin="round" />
      {marker && (
        <>
          <line
            x1={last[0]}
            x2={last[0]}
            y1={padTop}
            y2={padTop + innerHeight}
            className="stroke-foreground"
            strokeDasharray="2 3"
            opacity={0.35}
          />
          <circle cx={last[0]} cy={last[1]} r={4.5} className="fill-lime stroke-ink" strokeWidth={1.6} />
        </>
      )}
      {xLabels.map((text, index) => (
        <text
          key={text}
          x={(index / (xLabels.length - 1)) * innerWidth}
          y={height - 6}
          textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'}
          className={AXIS_TEXT}
        >
          {text}
        </text>
      ))}
    </svg>
  )
}

export type DonutSegment = { key: string; value: number; className: string }

export function Donut({
  segments,
  size = 160,
  thickness = 22,
  className,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  className?: string
}) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const center = size / 2
  const lengths = segments.map((segment) => (segment.value / total) * circumference)
  const starts = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={className}>
      {segments.map((segment, index) => {
        const length = lengths[index]
        const dashOffset = -starts[index]
        return (
          <circle
            key={segment.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeDasharray={`${Math.max(length - 2, 0)} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className={segment.className}
          />
        )
      })}
    </svg>
  )
}
