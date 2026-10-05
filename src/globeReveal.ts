import type { GeoJSONSource } from "maplibre-gl"

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "LineString"; coordinates: LngLat[] } | { type: "Point"; coordinates: LngLat } }
import type { Point as LngLat } from "./geo"

// The passport route told as a journey: a city pops in, the line travels along its arc to the next city, that city
// pops in, and so on. Shared by the Passport globe and the onboarding's.
export const DOT_MS = 150
export const ARC_MS = 320

// Timing for one reveal. `pace` scales both phases (below 1 is faster); `linear` drops the easing so the dots and the
// travelling line move at an even speed.
export type Pace = { pace?: number; linear?: boolean }
const steps = ({ pace = 1 }: Pace = {}) => ({ dot: DOT_MS * pace, arc: ARC_MS * pace })

// When each place's dot starts popping, in ms from the start of the reveal.
export const dotTimes = (count: number, opts?: Pace) => {
  const { dot, arc } = steps(opts)
  return Array.from({ length: count }, (_, index) => index * (dot + arc))
}
export const revealMs = (count: number, opts?: Pace) => {
  const { dot, arc } = steps(opts)
  return (count - 1) * (dot + arc) + dot
}

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

type Place = { coord: LngLat; props?: Record<string, unknown> }
type Arc = { coordinates: LngLat[]; props?: Record<string, unknown> }

// The route at `elapsed` ms: every dot carries `s` (0–1, its pop scale) and the arc in flight is cut where the line has got to.
export function routeAt(places: Place[], arcs: Arc[], elapsed: number, opts: Pace = {}) {
  const { dot, arc: arcMs } = steps(opts)
  const step = dot + arcMs
  const along = opts.linear ? (t: number) => t : easeInOut
  const pop = opts.linear ? (t: number) => t : easeOutBack
  const features: Feature[] = []
  arcs.forEach((arc, index) => {
    const t = Math.min(Math.max((elapsed - index * step - dot) / arcMs, 0), 1)
    if (t <= 0) return
    const end = Math.max(2, Math.round(along(t) * (arc.coordinates.length - 1)) + 1)
    features.push({ type: "Feature", properties: { ...arc.props, i: index }, geometry: { type: "LineString", coordinates: arc.coordinates.slice(0, end) } })
  })
  places.forEach((place, index) => {
    const t = Math.min(Math.max((elapsed - index * step) / dot, 0), 1)
    if (t <= 0) return
    features.push({ type: "Feature", properties: { ...place.props, i: index, s: Math.max(0, pop(t)) }, geometry: { type: "Point", coordinates: place.coord } })
  })
  return { type: "FeatureCollection" as const, features }
}

// Plays the reveal into `source`; the returned function stops it and shows everything at once (or nothing, when
// `clear` is set).
export function playRoute(source: GeoJSONSource, places: Place[], arcs: Arc[], delay = 0, opts: Pace = {}) {
  const total = revealMs(places.length, opts)
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    source.setData(routeAt(places, arcs, total, opts))
    return () => {}
  }
  source.setData(routeAt(places, arcs, 0, opts))
  let frame = 0
  const begin = performance.now() + delay
  const tick = (now: number) => {
    const elapsed = now - begin
    source.setData(routeAt(places, arcs, Math.max(0, elapsed), opts))
    if (elapsed < total) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return (clear = false) => {
    cancelAnimationFrame(frame)
    source.setData(routeAt(places, arcs, clear ? -1 : total, opts))
  }
}
