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
  inYear,
  passportArcs,
  passportStamps,
  stampYear,
  tripYear,
  trips,
  type DayId,
  type TripId,
} from "../data"
import type { Point } from "../geo"
import { awayEntries, mapPaths, stopKey } from "../mapPaths"
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
  spot: Point | null
  removed: { stops: string[]; trips: string[] }
  onInteract: () => void
  onStamp: (id: string) => void
  onTrip: (trip: TripId, day: DayId | null, stop?: { id: string; coord: Point }) => void
  onTripsInView: (count: number) => void
  onAlreadyHere: () => void
}

const HIT = 12
const tripOf = (id: string) => trips.find((trip) => trip.stampIds.includes(id))
const tripOfStamp = (id: string) => tripOf(id)?.id as TripId | undefined
const coverOf = (id: string) => tripOf(id)?.stampIds[0] ?? id

const tripsIn = (year: number) => trips.filter((trip) => tripYear(trip) === year).map((trip) => trip.id)
const stampsIn = (year: Year) => passportStamps.filter((stamp) => inYear(stampYear(stamp), year))

const ROUTE_LAYERS = ["path-glow", "path-future-casing", "path-future", "path-past", "path-dots"]
// A light white casing under the future dashes keeps them legible across streets and labels.
const PASSPORT_LAYERS = ["passport-arcs", "passport-dots"]
const OVERVIEW_ZOOM = 8.5
const SPOT_ZOOM = 16.2
const isGlobe = (focus: MapFocus) => focus === "globe" || focus.startsWith("stamp:")
const isAway = (focus: MapFocus) => focus.startsWith("away:")
const awayTrip = (focus: MapFocus) => focus.slice(5) as Exclude<TripId, "lisbon">

const paths = mapPaths(TODAY)
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
const PAST = "#2b59f0"
const FUTURE = PAST
const FUTURE_DIM = "#c8d4fb"
// Figma: 3px stroke, dasharray 8 8, round caps. MapLibre measures dashes in line widths.
// One stroke for the future line and the future stops' ring, so the dashes and the circles read as the same pen.
const FUTURE_STROKE = 3.5
// Figma's 8px dash / 8px gap, in MapLibre's line-width units.
const FUTURE_DASH = [8 / FUTURE_STROKE, 8 / FUTURE_STROKE]
// Figma stops are SVG circles with a centred stroke; MapLibre strokes outside the radius, so radius = r - stroke / 2.
const PAST_STOP = { radius: 7.15 - 1.5, stroke: 3 }
// Future stops keep Figma's outer size (~17px) with a heavier 3.5px ring.
const FUTURE_STOP = { radius: 7.12 + 1.375 - FUTURE_STROKE, stroke: FUTURE_STROKE }
const PAST_WIDTH = 5
// Dashed "still to come" lines only make sense inside the trip in progress; every other trip draws solid.
const DASHED: maplibregl.FilterSpecification = ["all", ["==", ["get", "future"], true], ["==", ["get", "trip"], "lisbon"]]
const SOLID: maplibregl.FilterSpecification = ["!", DASHED]
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

// On the globe projection the sphere's diameter is worldSize / π, so this is the zoom that fits it in `size` pixels.
const globeZoom = (size: number) => Math.log2((Math.max(size, 120) * Math.PI) / 512)

function frame(map: maplibregl.Map, sheetTop: number, focus: MapFocus, highlight: MapHighlight, year: Year, spot: Point | null) {
  const width = map.getContainer().clientWidth
  const height = map.getContainer().clientHeight
  if (focus === "globe") {
    const top = 56
    const above = Math.max(sheetTop, top + 160)
    const padding = { top, bottom: height - above, left: 0, right: 0 }
    const stamps = stampsIn(year)
    if (year === "all" || stamps.length === 0) {
      const globe = { center: [2, 38] as Point, zoom: globeZoom(width * 0.95), padding }
      map.flyTo({ ...globe, duration: 1600, essential: true })
      // A flight from street zoom onto the globe lands off-center (the globe's zoom compensation drifts the latitude),
      // so once it has landed, settle onto the intended view. A flight the user cut short is left alone.
      map.once("moveend", () => {
        const off = Math.abs(map.getCenter().lat - globe.center[1]) > 2 || Math.abs(map.getZoom() - globe.zoom) > 0.05
        if (off && Math.abs(map.getZoom() - globe.zoom) < 1.5) map.easeTo({ ...globe, duration: 500 })
      })
      return
    }
    const camera = fit(stamps.map((stamp) => stamp.coord), width - 96, above - top - 60, 5.5)
    map.flyTo({ ...camera, padding, duration: 1400, essential: true })
    return
  }
  if (focus.startsWith("stamp:")) {
    const stamp = passportStamps.find((item) => `stamp:${item.id}` === focus)
    const below = Math.min(height - 150, height * 0.81)
    if (stamp) map.flyTo({ center: stamp.coord, zoom: 7.6, padding: { top: Math.max(0, 2 * below - height), bottom: 0, left: 0, right: 0 }, duration: 1400, essential: true })
    return
  }
  const target = routeCamera(map, sheetTop, focus, highlight, year, spot)
  if (!target) return
  const { camera, padding } = target
  if (Math.abs(map.getZoom() - camera.zoom) > 4) map.flyTo({ ...camera, padding, duration: 1500, essential: true })
  else map.easeTo({ ...camera, padding, duration: 700 })
}

function routeCamera(map: maplibregl.Map, sheetTop: number, focus: MapFocus, highlight: MapHighlight, year: Year, spot: Point | null) {
  const width = map.getContainer().clientWidth
  const height = map.getContainer().clientHeight
  const peeking = sheetTop > height * 0.5
  const top = peeking ? 124 : 56
  const bottom = Math.max(height - sheetTop + (peeking ? 28 : 16), 0)
  if (height - top - bottom < 100) return null
  const padding = { top, bottom, left: 36, right: 36 }
  let camera: { center: maplibregl.LngLatLike; zoom: number }
  if (spot && focus !== "trip") camera = { center: spot, zoom: SPOT_ZOOM }
  else if (focus === "trip" && year !== "all") {
    const coords = coordsForYear(year)
    if (!coords.length) return null
    camera = fit(coords, width - 72, height - top - bottom, 12)
  } else if (isAway(focus)) {
    const plans = awayPlans[awayTrip(focus)]
    if (!plans) return null
    const picked = plans.find((plan) => plan.day === highlight?.day)
    const coords = picked ? picked.path : plans.flatMap((plan) => plan.path)
    camera = fit(coords, width - 72, height - top - bottom, 15)
  }
  else if (focus === "now") camera = { center: currentPoint, zoom: 15.6 }
  else if (focus === "trip") {
    const today = fit(dayFocus(TODAY).coords, width - 72, height - top - bottom, 15)
    camera = { center: currentPoint, zoom: Math.min(today.zoom + 0.55, 15.2) }
  } else camera = fit(dayFocus(focus as DayId).coords, width - 72, height - top - bottom, 15.4)
  return { camera, padding }
}

// True when the camera already shows what a locate tap would fly to, within a few pixels and a sliver of zoom.
function framed(map: maplibregl.Map, target: NonNullable<ReturnType<typeof routeCamera>>) {
  const { camera, padding } = target
  const container = map.getContainer()
  const at = map.project(camera.center)
  const x = padding.left + (container.clientWidth - padding.left - padding.right) / 2
  const y = padding.top + (container.clientHeight - padding.top - padding.bottom) / 2
  return Math.abs(map.getZoom() - camera.zoom) < 0.35 && Math.hypot(at.x - x, at.y - y) < 32
}

export function MapView({ palette, locateTick, year, sheetTop, focus, highlight, spot, removed, onInteract, onStamp, onTrip, onTripsInView, onAlreadyHere }: Props) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<HTMLElement[]>([])
  const stopRefs = useRef(new Map<string, HTMLElement>())
  const latest = useRef({ palette, sheetTop, focus, highlight, spot, removed, onInteract, onStamp, onTrip, onTripsInView, onAlreadyHere, year })
  const ready = useRef(false)
  const syncRef = useRef(() => {})
  const pingRef = useRef<(coord: Point) => void>(() => {})
  const lastLocate = useRef(locateTick)

  useEffect(() => {
    latest.current = { palette, sheetTop, focus, highlight, spot, removed, onInteract, onStamp, onTrip, onTripsInView, onAlreadyHere, year }
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
    const ping = (coord: Point) => {
      const el = document.createElement("div")
      el.className = "tap-ping"
      const ring = el.appendChild(document.createElement("i"))
      const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(coord).addTo(map)
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches
      const easing = "cubic-bezier(0.23, 1, 0.32, 1)"
      ring.animate(
        still
          ? [{ opacity: 0, easing }, { opacity: 1, offset: 0.25, easing: "ease" }, { opacity: 0 }]
          : [
              { opacity: 0, transform: "scale(0.6)", easing },
              { opacity: 1, transform: "scale(1)", offset: 0.25, easing: "ease" },
              { opacity: 0, transform: "scale(1.45)" },
            ],
        { duration: 1000 },
      ).finished.then(() => marker.remove(), () => marker.remove())
    }
    const trip = (el: HTMLElement, day: DayId, id: string, coord: Point) => {
      markerRefs.current.push(el)
      el.addEventListener("click", (event) => {
        event.stopPropagation()
        latest.current.onTrip("lisbon", day, { id, coord })
      })
      return el
    }
    for (const stop of paths.markers) {
      const el = trip(add(stop.at, stop.past ? "stop-dot past" : "stop-dot", ""), stop.day, stop.id, stop.at)
      el.dataset.day = stop.day
      el.dataset.stop = stopKey(stop.day, stop.id)
      stopEls.set(`${stop.id}@${key(stop.coord)}`, el)
    }
    stopEls.set(key(currentPoint), trip(add(paths.here, "here-pin", `<i></i>`), TODAY, "hotel", paths.here))
    const syncMarkers = () => {
      const { focus, year, removed } = latest.current
      const lisbonOn = year === "all" || year === 2026
      const visible = lisbonOn && !isGlobe(focus) && !isAway(focus) && map.getZoom() >= OVERVIEW_ZOOM
      const day = isDay(focus) ? focus : TODAY
      for (const el of markerRefs.current) el.style.display = visible && (!el.dataset.day || el.dataset.day === day) && !removed.stops.includes(el.dataset.stop ?? "") ? "" : "none"
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
        if (isGlobe(latest.current.focus)) return latest.current.onStamp(coverOf(String(props.id)))
        const owner = tripOfStamp(String(props.id))
        if (owner) return latest.current.onTrip(owner, null)
      }
      if (hit?.layer.id === "path-dots" && props.trip) {
        const coord = (hit.geometry as unknown as { coordinates: Point }).coordinates
        if (!props.stop) ping(coord)
        return latest.current.onTrip(props.trip as TripId, String(props.day), props.stop ? { id: String(props.stop), coord } : undefined)
      }
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
      map.addSource("paths", { type: "geojson", data: { type: "FeatureCollection", features: paths.lines } })
      map.addSource("path-stops", { type: "geojson", data: { type: "FeatureCollection", features: paths.dots } })
      const fade = { duration: 350 }
      map.addLayer({
        id: "path-glow",
        type: "line",
        source: "paths",
        filter: DASHED,
        paint: { "line-color": FUTURE, "line-width": 14, "line-blur": 6, "line-opacity": 0, "line-opacity-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-future-casing",
        type: "line",
        source: "paths",
        filter: DASHED,
        paint: { "line-color": "#ffffff", "line-width": FUTURE_STROKE + 4, "line-opacity-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-future",
        type: "line",
        source: "paths",
        filter: DASHED,
        paint: { "line-color": FUTURE, "line-width": FUTURE_STROKE, "line-dasharray": FUTURE_DASH, "line-opacity-transition": fade, "line-color-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-past",
        type: "line",
        source: "paths",
        filter: SOLID,
        paint: { "line-color": PAST, "line-width": PAST_WIDTH, "line-opacity-transition": fade },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "path-dots",
        type: "circle",
        source: "path-stops",
        paint: {
          "circle-color": ["case", ["get", "future"], "#ffffff", PAST],
          "circle-stroke-color": ["case", ["get", "future"], PAST, "#ffffff"],
          "circle-radius": ["case", ["get", "future"], FUTURE_STOP.radius, PAST_STOP.radius],
          "circle-stroke-width": ["case", ["get", "future"], FUTURE_STOP.stroke, PAST_STOP.stroke],
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
        paint: { "line-color": "#2b59f0", "line-width": 3, "line-opacity": 0.4 },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "passport-dots",
        type: "circle",
        source: "passport",
        maxzoom: OVERVIEW_ZOOM,
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 6, "circle-color": "#2b59f0", "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
      })
      applyPalette(map, latest.current.palette)
      ready.current = true
      syncRoute(map, latest.current.focus, latest.current.highlight, latest.current.year, latest.current.removed)
      frame(map, latest.current.sheetTop, latest.current.focus, latest.current.highlight, latest.current.year, latest.current.spot)
    })
    syncRef.current = syncMarkers
    pingRef.current = ping

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
    if (ready.current) syncRoute(map, focus, highlight, year, removed)
  }, [year, focus, highlight, removed])

  useEffect(() => {
    if (spot) pingRef.current(spot)
  }, [spot])

  useEffect(() => {
    const highlighted = isDay(focus) ? key(dayFocus(focus).first) : null
    for (const [id, el] of stopRefs.current) el.classList.toggle("focus", id.endsWith(`@${highlighted}`))
    const map = mapRef.current
    if (!map || !ready.current) return
    const located = lastLocate.current !== locateTick
    lastLocate.current = locateTick
    if (located && !map.isMoving()) {
      const target = routeCamera(map, sheetTop, focus, highlight, year, spot)
      if (target && framed(map, target)) {
        latest.current.onAlreadyHere()
        return
      }
    }
    frame(map, sheetTop, focus, highlight, year, spot)
  }, [sheetTop, focus, highlight, locateTick, year, spot])

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

function syncRoute(map: maplibregl.Map, focus: MapFocus, highlight: MapHighlight, year: Year, removed: Props["removed"]) {
  syncLayers(map, focus, highlight)
  if (map.getLayer("passport-arcs")) map.setFilter("passport-arcs", passportFilter("LineString", year))
  if (map.getLayer("passport-dots")) map.setFilter("passport-dots", passportFilter("Point", year))
  if (!map.getLayer("path-dots")) return
  const byYear = focus === "trip" ? yearClause(year) : null
  const kept: maplibregl.FilterSpecification = ["!", ["in", ["get", "trip"], ["literal", removed.trips]]]
  const clause = (byYear ? ["all", byYear, kept] : kept) as maplibregl.FilterSpecification
  const withYear = (base: maplibregl.FilterSpecification) => ["all", base, clause] as maplibregl.FilterSpecification
  const futureOnly = withYear(DASHED)
  const pastOnly = withYear(SOLID)
  const stopsKept = withYear(["!", ["in", ["concat", ["get", "day"], "/", ["get", "stop"]], ["literal", removed.stops]]])
  for (const id of ["path-glow", "path-future-casing", "path-future"]) map.setFilter(id, futureOnly)
  map.setFilter("path-past", pastOnly)
  map.setFilter("path-dots", stopsKept)
  const picked: maplibregl.ExpressionSpecification = highlight
    ? ["all", ["==", ["get", "trip"], highlight.trip], ["==", ["get", "day"], highlight.day]]
    : ["literal", false]
  const future: maplibregl.ExpressionSpecification = ["get", "future"]
  const shown = (on: number, base: number, rest: number) =>
    (highlight
      ? ["case", picked, on, ["get", "rest"], rest, 0]
      : ["case", ["get", "rest"], base, 0]) as maplibregl.ExpressionSpecification
  map.setPaintProperty("path-future", "line-opacity", shown(1, 1, 1))
  // Light: enough to keep dashes legible over streets without reading as a road of its own.
  map.setPaintProperty("path-future-casing", "line-opacity", shown(0.7, 0.7, 0.35))
  map.setPaintProperty("path-future", "line-color", highlight ? ["case", picked, FUTURE, FUTURE_DIM] : FUTURE)
  map.setPaintProperty("path-glow", "line-opacity", highlight ? ["case", picked, 0.05, 0] : 0)
  map.setPaintProperty("path-past", "line-opacity", shown(1, 1, 0.18))
  const pastWidth: maplibregl.ExpressionSpecification | number = isAway(focus) ? PAST_WIDTH : ["case", ["==", ["get", "trip"], "lisbon"], PAST_WIDTH, 2]
  map.setPaintProperty("path-past", "line-width", pastWidth)
  const dots = (highlight ? ["case", picked, 1, 0.25] : 1) as maplibregl.ExpressionSpecification | number
  map.setPaintProperty("path-dots", "circle-opacity", dots)
  map.setPaintProperty("path-dots", "circle-stroke-opacity", highlight ? ["case", picked, 1, 0.25] : 1)
  map.setPaintProperty("path-dots", "circle-radius", ["case", future, FUTURE_STOP.radius, PAST_STOP.radius])
}
