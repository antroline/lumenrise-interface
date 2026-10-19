export type Point = [x: number, y: number]

export function scalePoints(data: number[], width: number, height: number, pad = 0, min?: number, max?: number): Point[] {
  const lo = min ?? Math.min(...data)
  const hi = max ?? Math.max(...data)
  return data.map((value, index) => [
    pad + (index / (data.length - 1)) * (width - pad * 2),
    height - pad - ((value - lo) / (hi - lo || 1)) * (height - pad * 2),
  ])
}

export function linePath(points: Point[]) {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

export function areaPath(points: Point[], baseline: number) {
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath(points)} L${last[0].toFixed(1)} ${baseline} L${first[0].toFixed(1)} ${baseline} Z`
}
