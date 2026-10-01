import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  awayPlans,
  currentPoint,
  dayFocus,
  dayRoute,
  days,
  futureStops,
  isPastTrip,
  mapStops,
  inYear,
  passportArcs,
  passportStamps,
  stampYear,
  tripYear,
  trips,
  type DayId,
  type TripId,
} from "../data"
import { STYLE_URL, applyPalette, type Palette } from "../mapStyle"
import { TODAY } from "../state"

maplibregl.setWorkerUrl(workerUrl)

export type MapFocus = "trip" | "now" | "globe" | `away:${string}` | `stamp:${string}` | DayId
export type MapHighlight = { trip: TripId; day: DayId } | null

type Year = number | "all"

type Props = {
  palette: Palette
  locateTick: number
  year: Year
  sheetTop: number
  focus: MapFocus
  highlight: MapHighlight
  onInteract: () => void
  onStamp: (id: string) => void
  onTrip: (trip: TripId, day: DayId | null) => void
  onTripsInView: (count: number) => void
}

const HIT = 12
const tripOfStamp = (id: string) => trips.find((trip) => trip.stampIds.includes(id))?.id as TripId | undefined

const tripsIn = (year: number) => trips.filter((trip) => tripYear(trip) === year).map((trip) => trip.id)
const stampsIn = (year: Year) => passportStamps.filter((stamp) => inYear(stampYear(stamp), year))

const ROUTE_LAYERS = ["path-glow", "path-future", "path-past", "path-dots"]
const PASSPORT_LAYERS = ["passport-arcs", "passport-dots"]
const OVERVIEW_ZOOM = 8.5
const isGlobe = (focus: MapFocus) => focus === "globe" || focus.startsWith("stamp:")
const isAway = (focus: MapFocus) => focus.startsWith("away:")
const awayTrip = (focus: MapFocus) => focus.slice(5) as Exclude<TripId, "lisbon">

type Point = [number, number]

function meters(a: Point, b: Point) {
  const cos = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180)
  return [(b[0] - a[0]) * 111320 * cos, (b[1] - a[1]) * 110540]
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

const line = (trip: TripId, day: DayId, future: boolean, rest: boolean, coordinates: Point[]) => ({
  type: "Feature" as const,
  properties: { trip, day, future, rest },
  geometry: { type: "LineString" as const, coordinates: round(simplify(coordinates, 25)) },
})
const dot = (trip: TripId, day: DayId, future: boolean, coordinates: Point) => ({
  type: "Feature" as const,
  properties: { trip, day, future },
  geometry: { type: "Point" as const, coordinates },
})
const awayEntries = Object.entries(awayPlans) as [Exclude<TripId, "lisbon">, (typeof awayPlans)["tokyo"]][]
const pathLines = [
  ...days.flatMap((day) => dayRoute(day.id).map((leg) => line("lisbon", day.id, leg.future, leg.future || day.id === TODAY, leg.coords))),
  ...awayEntries.flatMap(([trip, plans]) => plans.map((plan) => line(trip, plan.day, !isPastTrip(trip), true, plan.path))),
]
const pathDots = [
  ...futureStops.map((stop) => dot("lisbon", stop.day, true, stop.coord)),
  ...awayEntries.flatMap(([trip, plans]) => plans.flatMap((plan) => plan.stops.map((coord) => dot(trip, plan.day, !isPastTrip(trip), coord)))),
]
const tripIds = ["lisbon", ...awayEntries.map(([trip]) => trip)]
const tripPoints: Point[][] = [
  [currentPoint, ...days.flatMap((day) => dayRoute(day.id).flatMap((leg) => leg.coords))],
  ...awayEntries.map(([, plans]) => plans.flatMap((plan) => plan.path)),
]
function coordsForYear(year: number) {
  const ids = new Set(tripsIn(year))
  if (year === 2026) ids.delete("tokyo")
  return tripPoints.filter((_, index) => ids.has(tripIds[index])).flat()
}
const FUTURE = "#0e1a36"
const PAST = "#2b59f0"
const key = ([lng, lat]: [number, number]) => `${lng},${lat}`
const isDay = (focus: MapFocus): focus is DayId => focus === "mon" || focus === "tue" || focus === "wed" || focus === "thu"

function fit(coords: [number, number][], width: number, height: number, maxZoom: number) {
  const points = coords.map((point) => maplibregl.MercatorCoordinate.fromLngLat(point))
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const zoom = Math.log2(Math.min(width / Math.max((x2 - x1) * 512, 1e-9), height / Math.max((y2 - y1) * 512, 1e-9)))
  return {
    center: new maplibregl.MercatorCoordinate((x1 + x2) / 2, (y1 + y2) / 2).toLngLat(),
    zoom: Math.min(zoom, maxZoom),
  }
}

function frame(map: maplibregl.Map, sheetTop: number, focus: MapFocus, highlight: MapHighlight, year: Year) {
  const width = map.getContainer().clientWidth
  const height = map.getContainer().clientHeight
  if (focus === "globe") {
    const padding = { top: 56, bottom: height - 340, left: 0, right: 0 }
    const stamps = stampsIn(year)
    if (year === "all" || stamps.length === 0) {
      map.flyTo({ center: [2, 47], zoom: 1.35, padding, duration: 1600, essential: true })
      return
    }
    const camera = fit(stamps.map((stamp) => stamp.coord), width - 96, 340 - 56 - 60, 5.5)
    map.flyTo({ ...camera, padding, duration: 1400, essential: true })
    return
  }
  if (focus.startsWith("stamp:")) {
    const stamp = passportStamps.find((item) => `stamp:${item.id}` === focus)
    const below = Math.min(height - 150, height * 0.81)
    if (stamp) map.flyTo({ center: stamp.coord, zoom: 7.6, padding: { top: Math.max(0, 2 * below - height), bottom: 0, left: 0, right: 0 }, duration: 1400, essential: true })
    return
  }
  const peeking = sheetTop > height * 0.5
  const top = peeking ? 124 : 56
  const bottom = Math.max(height - sheetTop + (peeking ? 28 : 16), 0)
  if (height - top - bottom < 100) return
  const padding = { top, bottom, left: 36, right: 36 }
  let camera: { center: maplibregl.LngLatLike; zoom: number }
  if (focus === "trip" && year !== "all") {
    const coords = coordsForYear(year)
    if (!coords.length) return
    camera = fit(coords, width - 72, height - top - bottom, 12)
  } else if (isAway(focus)) {
    const plans = awayPlans[awayTrip(focus)]
    if (!plans) return
    const picked = plans.find((plan) => plan.day === highlight?.day)
    const coords = picked ? picked.path : plans.flatMap((plan) => plan.path)
    camera = fit(coords, width - 72, height - top - bottom, 15)
  }
  else if (focus === "now") camera = { center: currentPoint, zoom: 15.6 }
  else if (focus === "trip") {
    const today = fit(dayFocus(TODAY).coords, width - 72, height - top - bottom, 15)
    camera = { center: currentPoint, zoom: Math.min(today.zoom + 0.55, 15.2) }
  } else camera = fit(dayFocus(focus as DayId).coords, width - 72, height - top - bottom, 15.4)
  if (Math.abs(map.getZoom() - camera.zoom) > 4) map.flyTo({ ...camera, padding, duration: 1500, essential: true })
  else map.easeTo({ ...camera, padding, duration: 700 })
}

export function MapView({ palette, locateTick, year, sheetTop, focus, highlight, onInteract, onStamp, onTrip, onTripsInView }: Props) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<HTMLElement[]>([])
  const stopRefs = useRef(new Map<string, HTMLElement>())
  const latest = useRef({ palette, sheetTop, focus, highlight, onInteract, onStamp, onTrip, onTripsInView, year })
  const ready = useRef(false)
  const syncRef = useRef(() => {})

  useEffect(() => {
    latest.current = { palette, sheetTop, focus, highlight, onInteract, onStamp, onTrip, onTripsInView, year }
  })

  useEffect(() => {
    if (!node.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: node.current,
      style: STYLE_URL,
      center: currentPoint,
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
    })
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(node.current)

    const markers: maplibregl.Marker[] = []
    const stopEls = stopRefs.current
    const add = (coord: [number, number], className: string, html: string, options: maplibregl.MarkerOptions = {}) => {
      const el = document.createElement("div")
      el.className = className
      el.innerHTML = html
      markers.push(new maplibregl.Marker({ element: el, anchor: "center", ...options }).setLngLat(coord).addTo(map))
      return el
    }
    const trip = (el: HTMLElement, day: DayId) => {
      markerRefs.current.push(el)
      el.addEventListener("click", (event) => {
        event.stopPropagation()
        latest.current.onTrip("lisbon", day)
      })
      return el
    }
    for (const stop of mapStops) {
      const el = trip(add(stop.coord, stop.past ? "stop-dot past" : "stop-dot", ""), stop.day)
      el.dataset.day = stop.day
      stopEls.set(`${stop.id}@${key(stop.coord)}`, el)
    }
    stopEls.set(key(currentPoint), trip(add(currentPoint, "here-pin", `<i></i>`), TODAY))
    const syncMarkers = () => {
      const { focus, year } = latest.current
      const lisbonOn = year === "all" || year === 2026
      const visible = lisbonOn && !isGlobe(focus) && !isAway(focus) && map.getZoom() >= OVERVIEW_ZOOM
      const day = isDay(focus) ? focus : TODAY
      for (const el of markerRefs.current) el.style.display = visible && (!el.dataset.day || el.dataset.day === day) ? "" : "none"
    }
    syncMarkers()
    map.on("zoom", () => {
      syncMarkers()
      if (ready.current) syncLayers(map, latest.current.focus, latest.current.highlight)
    })
    const countTrips = () => {
      const bounds = map.getBounds()
      const width = map.getContainer().clientWidth
      const bottom = Math.min(latest.current.sheetTop, map.getContainer().clientHeight)
      const seen = (point: Point) => {
        if (!bounds.contains(point)) return false
        const { x, y } = map.project(point)
        return x >= 0 && x <= width && y >= 0 && y <= bottom
      }
      latest.current.onTripsInView(tripPoints.filter((points) => points.some(seen)).length)
    }
    map.on("moveend", countTrips)

    const interact = () => latest.current.onInteract()
    const tapped = (point: maplibregl.Point) => {
      const layers = ["path-dots", "passport-dots"].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none")
      if (!layers.length) return null
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - HIT, point.y - HIT],
        [point.x + HIT, point.y + HIT],
      ]
      const hits = map.queryRenderedFeatures(box, { layers })
      if (!hits.length) return null
      return hits.reduce((best, hit) => {
        const near = (feature: maplibregl.MapGeoJSONFeature) => {
          const at = map.project((feature.geometry as unknown as { coordinates: Point }).coordinates)
          return Math.hypot(at.x - point.x, at.y - point.y)
        }
        return near(hit) < near(best) ? hit : best
      })
    }
    map.on("dragstart", interact)
    map.on("click", (event) => {
      const hit = tapped(event.point)
      const props = hit?.properties ?? {}
      if (hit?.layer.id === "passport-dots" && props.id) {
        if (isGlobe(latest.current.focus)) return latest.current.onStamp(String(props.id))
        const owner = tripOfStamp(String(props.id))
        if (owner) return latest.current.onTrip(owner, null)
      }
      if (hit?.layer.id === "path-dots" && props.trip) return latest.current.onTrip(props.trip as TripId, String(props.day))
      interact()
    })
    map.on("mousemove", (event) => {
      map.getCanvas().style.cursor = tapped(event.point) ? "pointer" : ""
    })
    map.on("zoomstart", (event) => {
      if (event.originalEvent) interact()
    })

    map.on("load", () => {
      map.setProjection({ type: "globe" })
      map.addSource("paths", { type: "geojson", data: { type: "FeatureCollection", features: pathLines } })
      map.addSource("path-stops", { type: "geojson", data: { type: "FeatureCollection", features: pathDots } })
      const fade = { duration: 350 }
      map.addLayer({
        id: "path-glow",
        type: "line",
        source: "paths",
        filter: ["==", ["get", "future"], true],
        paint: { "line-color": FUTURE, "line-width": 14, "line-blur": 6, "line-opacity": 0, "line-opacity-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-future",
        type: "line",
        source: "paths",
        filter: ["==", ["get", "future"], true],
        paint: { "line-color": "#999fad", "line-width": 4, "line-opacity-transition": fade, "line-color-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-past",
        type: "line",
        source: "paths",
        filter: ["==", ["get", "future"], false],
        paint: { "line-color": PAST, "line-width": 6, "line-opacity-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-dots",
        type: "circle",
        source: "path-stops",
        paint: {
          "circle-color": ["case", ["get", "future"], "#ffffff", PAST],
          "circle-stroke-color": ["case", ["get", "future"], FUTURE, "#ffffff"],
          "circle-stroke-width": 2,
          "circle-opacity-transition": fade,
          "circle-stroke-opacity-transition": fade,
          "circle-radius-transition": fade,
        },
      })
      map.addSource("passport", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            ...passportArcs.map((coordinates, index) => ({
              type: "Feature" as const,
              properties: { id: "", from: stampYear(passportStamps[index]), to: stampYear(passportStamps[index + 1]) },
              geometry: { type: "LineString" as const, coordinates },
            })),
            ...passportStamps.map((stamp) => ({ type: "Feature" as const, properties: { id: stamp.id, from: stampYear(stamp), to: stampYear(stamp) }, geometry: { type: "Point" as const, coordinates: stamp.coord } })),
          ],
        },
      })
      map.addLayer({
        id: "passport-arcs",
        type: "line",
        source: "passport",
        maxzoom: OVERVIEW_ZOOM,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#2b59f0", "line-width": 2, "line-opacity": 0.75 },
        layout: { "line-cap": "round" },
      })
      map.addLayer({
        id: "passport-dots",
        type: "circle",
        source: "passport",
        maxzoom: OVERVIEW_ZOOM,
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 6, "circle-color": "#2b59f0", "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 },
      })
      applyPalette(map, latest.current.palette)
      ready.current = true
      syncRoute(map, latest.current.focus, latest.current.highlight, latest.current.year)
      frame(map, latest.current.sheetTop, latest.current.focus, latest.current.highlight, latest.current.year)
    })
    syncRef.current = syncMarkers

    return () => {
      ro.disconnect()
      for (const marker of markers) marker.remove()
      markerRefs.current = []
      stopEls.clear()
      ready.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready.current) return
    applyPalette(map, palette)
  }, [palette])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    syncRef.current()
    if (ready.current) syncRoute(map, focus, highlight, year)
  }, [year, focus, highlight])

  useEffect(() => {
    const highlighted = isDay(focus) ? key(dayFocus(focus).first) : null
    for (const [id, el] of stopRefs.current) el.classList.toggle("focus", id.endsWith(`@${highlighted}`))
    const map = mapRef.current
    if (map && ready.current) frame(map, sheetTop, focus, highlight, year)
  }, [sheetTop, focus, highlight, locateTick, year])

  return (
    <div className="map-wrap">
      <div ref={node} className="map" />
    </div>
  )
}

function yearClause(year: Year): maplibregl.FilterSpecification | null {
  if (year === "all") return null
  const ids = tripsIn(year)
  return ids.length ? ["in", ["get", "trip"], ["literal", ids]] : ["==", ["get", "trip"], ""]
}

function passportFilter(kind: "LineString" | "Point", year: Year) {
  const base: maplibregl.FilterSpecification = ["==", ["geometry-type"], kind]
  if (year === "all") return base
  return ["all", base, ["==", ["get", "from"], year], ["==", ["get", "to"], year]] as maplibregl.FilterSpecification
}

function syncLayers(map: maplibregl.Map, focus: MapFocus, highlight: MapHighlight) {
  const globe = isGlobe(focus)
  const detail = !globe && (highlight !== null || map.getZoom() >= OVERVIEW_ZOOM)
  const overview = globe || highlight === null
  const set = (id: string, on: boolean) => {
    if (map.getLayer(id) && (map.getLayoutProperty(id, "visibility") !== "none") !== on) map.setLayoutProperty(id, "visibility", on ? "visible" : "none")
  }
  for (const id of ROUTE_LAYERS) set(id, detail)
  for (const id of PASSPORT_LAYERS) set(id, overview)
}

function syncRoute(map: maplibregl.Map, focus: MapFocus, highlight: MapHighlight, year: Year) {
  syncLayers(map, focus, highlight)
  if (map.getLayer("passport-arcs")) map.setFilter("passport-arcs", passportFilter("LineString", year))
  if (map.getLayer("passport-dots")) map.setFilter("passport-dots", passportFilter("Point", year))
  if (!map.getLayer("path-dots")) return
  const clause = focus === "trip" ? yearClause(year) : null
  const withYear = (base: maplibregl.FilterSpecification) => (clause ? ["all", base, clause] : base) as maplibregl.FilterSpecification
  map.setFilter("path-glow", withYear(["==", ["get", "future"], true]))
  map.setFilter("path-future", withYear(["==", ["get", "future"], true]))
  map.setFilter("path-past", withYear(["==", ["get", "future"], false]))
  map.setFilter("path-dots", clause)
  const picked: maplibregl.ExpressionSpecification = highlight
    ? ["all", ["==", ["get", "trip"], highlight.trip], ["==", ["get", "day"], highlight.day]]
    : ["literal", false]
  const future: maplibregl.ExpressionSpecification = ["get", "future"]
  const shown = (on: number, base: number, rest: number) =>
    (highlight
      ? ["case", picked, on, ["get", "rest"], rest, 0]
      : ["case", ["get", "rest"], base, 0]) as maplibregl.ExpressionSpecification
  map.setPaintProperty("path-future", "line-opacity", shown(1, 1, 1))
  map.setPaintProperty("path-future", "line-color", highlight ? ["case", picked, "#737b91", "#d9dce4"] : "#999fad")
  map.setPaintProperty("path-glow", "line-opacity", highlight ? ["case", picked, 0.08, 0] : 0)
  map.setPaintProperty("path-past", "line-opacity", shown(1, 1, 0.18))
  map.setPaintProperty("path-past", "line-width", isAway(focus) ? 6 : ["case", ["==", ["get", "trip"], "lisbon"], 6, 2])
  const dots = (highlight ? ["case", picked, 1, 0.25] : 1) as maplibregl.ExpressionSpecification | number
  map.setPaintProperty("path-dots", "circle-opacity", dots)
  map.setPaintProperty("path-dots", "circle-stroke-opacity", highlight ? ["case", picked, ["case", future, 0.65, 1], future, 0.25, 0.25] : ["case", future, 0.5, 1])
  map.setPaintProperty("path-dots", "circle-radius", highlight ? ["case", picked, 5, 3.5] : 4)
}
