export type Point = [number, number]

function meters(a: Point, b: Point) {
  const cos = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180)
  return [(b[0] - a[0]) * 111320 * cos, (b[1] - a[1]) * 110540]
}

export function distance(a: Point, b: Point) {
  const [x, y] = meters(a, b)
  return Math.hypot(x, y)
}

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3 || tolerance <= 0) return points
  const [first, last] = [points[0], points[points.length - 1]]
  const [ux, uy] = meters(first, last)
  const span = Math.hypot(ux, uy) || 1
  let far = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = meters(first, points[i])
    const off = Math.abs(ux * py - uy * px) / span
    if (off > far) [far, index] = [off, i]
  }
  if (far <= tolerance) return [first, last]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

// Chaikin corner cutting: softens street corners without drifting off the road the way a spline does.
function round(input: Point[], passes = 2): Point[] {
  let points = input.filter((point, i) => i === 0 || point[0] !== input[i - 1][0] || point[1] !== input[i - 1][1])
  for (let pass = 0; pass < passes && points.length > 2; pass++) {
    const out: Point[] = [points[0]]
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]]
      if (i > 0) out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25])
      if (i < points.length - 2) out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    out.push(points[points.length - 1])
    points = out
  }
  return points
}

export const smoothPath = (points: Point[]) => round(simplify(points, 25))

// Maplibre draws segments straight in Web Mercator, so projection has to happen there too.
const toMercator = ([lng, lat]: Point): Point => [lng / 360, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)]
const fromMercator = ([x, y]: Point): Point => [x * 360, (Math.atan(Math.exp(y * 2 * Math.PI)) * 360) / Math.PI - 90]

export function snapToPaths(point: Point, paths: Point[][]): Point {
  const p = toMercator(point)
  let best = point
  let bestGap = Infinity
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = toMercator(path[i])
      const b = toMercator(path[i + 1])
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
      const length = dx * dx + dy * dy
      const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0
      const at: Point = [a[0] + dx * t, a[1] + dy * t]
      const gap = (at[0] - p[0]) ** 2 + (at[1] - p[1]) ** 2
      if (gap < bestGap) [best, bestGap] = [fromMercator(at), gap]
    }
  }
  return best
}

export function gapToPaths(point: Point, paths: Point[][]) {
  return distance(point, snapToPaths(point, paths))
}
