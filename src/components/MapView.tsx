import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  currentPoint,
  dayFocus,
  dayRoute,
  futureRoute,
  futureStops,
  mapStops,
  passportArcs,
  passportStamps,
  pastRoute,
  tokyoRoute,
  tokyoStops,
  type DayId,
} from "../data"
import { STYLE_URL, applyPalette, type Palette } from "../mapStyle"
import { TODAY, isPastDay } from "../state"

maplibregl.setWorkerUrl(workerUrl)

export type MapFocus = "trip" | "now" | "globe" | "tokyo" | `stamp:${string}` | DayId

type Props = {
  palette: Palette
  locateTick: number
  showRoute: boolean
  sheetTop: number
  focus: MapFocus
  onInteract: () => void
  onStamp: (id: string) => void
}

const ROUTE_LAYERS = ["route-past", "route-future", "route-future-stops", "route-day", "tokyo-line", "tokyo-dots"]
const PASSPORT_LAYERS = ["passport-arcs", "passport-dots"]
const OVERVIEW_ZOOM = 8.5
const isGlobe = (focus: MapFocus) => focus === "globe" || focus.startsWith("stamp:")
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

function frame(map: maplibregl.Map, sheetTop: number, focus: MapFocus) {
  const width = map.getContainer().clientWidth
  const height = map.getContainer().clientHeight
  if (focus === "globe") {
    map.flyTo({ center: [2, 47], zoom: 1.35, padding: { top: 56, bottom: height - 340, left: 0, right: 0 }, duration: 1600, essential: true })
    return
  }
  if (focus.startsWith("stamp:")) {
    const stamp = passportStamps.find((item) => `stamp:${item.id}` === focus)
    if (stamp) map.flyTo({ center: stamp.coord, zoom: 5.2, padding: { top: 0, bottom: 260, left: 0, right: 0 }, duration: 1400, essential: true })
    return
  }
  const peeking = sheetTop > height * 0.5
  const top = peeking ? 124 : 56
  const bottom = Math.max(height - sheetTop + (peeking ? 28 : 16), 0)
  if (height - top - bottom < 100) return
  const padding = { top, bottom, left: 36, right: 36 }
  let camera: { center: maplibregl.LngLatLike; zoom: number }
  if (focus === "tokyo") camera = fit(tokyoRoute, width - 72, height - top - bottom, 14)
  else if (focus === "now") camera = { center: currentPoint, zoom: 15.6 }
  else if (focus === "trip") {
    const today = fit(dayFocus(TODAY).coords, width - 72, height - top - bottom, 15)
    camera = { center: today.center, zoom: Math.min(today.zoom + 0.55, 15.2) }
  } else camera = fit(dayFocus(focus as DayId).coords, width - 72, height - top - bottom, 15.4)
  if (Math.abs(map.getZoom() - camera.zoom) > 4) map.flyTo({ ...camera, padding, duration: 1500, essential: true })
  else map.easeTo({ ...camera, padding, duration: 700 })
}

function dayData(focus: MapFocus): Parameters<maplibregl.GeoJSONSource["setData"]>[0] {
  return {
    type: "FeatureCollection",
    features: isDay(focus)
      ? dayRoute(focus).map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } }))
      : [],
  }
}

export function MapView({ palette, locateTick, showRoute, sheetTop, focus, onInteract, onStamp }: Props) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<HTMLElement[]>([])
  const stopRefs = useRef(new Map<string, HTMLElement>())
  const latest = useRef({ palette, sheetTop, focus, onInteract, onStamp, showRoute })
  const ready = useRef(false)
  const syncRef = useRef(() => {})

  useEffect(() => {
    latest.current = { palette, sheetTop, focus, onInteract, onStamp, showRoute }
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
    const trip = (el: HTMLElement) => {
      markerRefs.current.push(el)
      return el
    }
    for (const stop of mapStops) {
      const el = trip(add(stop.coord, stop.past ? "stop-dot past" : "stop-dot", ""))
      el.dataset.day = stop.day
      stopEls.set(`${stop.id}@${key(stop.coord)}`, el)
    }
    stopEls.set(key(currentPoint), trip(add(currentPoint, "here-pin", `<i></i>`)))
    const syncMarkers = () => {
      const { focus, showRoute } = latest.current
      const visible = showRoute && !isGlobe(focus) && focus !== "tokyo" && map.getZoom() >= OVERVIEW_ZOOM
      const day = isDay(focus) ? focus : TODAY
      for (const el of markerRefs.current) el.style.display = visible && (!el.dataset.day || el.dataset.day === day) ? "" : "none"
    }
    syncMarkers()
    map.on("zoom", syncMarkers)

    const interact = () => latest.current.onInteract()
    map.on("dragstart", interact)
    map.on("click", interact)
    map.on("zoomstart", (event) => {
      if (event.originalEvent) interact()
    })

    map.on("load", () => {
      map.setProjection({ type: "globe" })
      map.addSource("trip-route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { kind: "past" }, geometry: { type: "LineString", coordinates: pastRoute } },
            { type: "Feature", properties: { kind: "future" }, geometry: { type: "LineString", coordinates: futureRoute } },
          ],
        },
      })
      map.addSource("day-route", { type: "geojson", data: dayData(latest.current.focus) })
      map.addLayer({
        id: "route-future",
        type: "line",
        source: "trip-route",
        filter: ["==", ["get", "kind"], "future"],
        paint: { "line-color": "#0e1a36", "line-opacity": 0.4, "line-width": 4, "line-opacity-transition": { duration: 300 } },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "route-past",
        type: "line",
        source: "trip-route",
        filter: ["==", ["get", "kind"], "past"],
        paint: { "line-color": "#2b59f0", "line-width": 6, "line-opacity-transition": { duration: 300 } },
        layout: { "line-cap": "round", "line-join": "miter", "line-miter-limit": 4 },
      })
      map.addLayer({
        id: "route-day",
        type: "line",
        source: "day-route",
        paint: { "line-color": "#2b59f0", "line-width": 7 },
        layout: { "line-cap": "round", "line-join": "miter", "line-miter-limit": 4 },
      })
      map.addSource("future-stops", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: futureStops.map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates } })),
        },
      })
      map.addLayer({
        id: "route-future-stops",
        type: "circle",
        source: "future-stops",
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#696b7d",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity-transition": { duration: 300 },
          "circle-stroke-opacity-transition": { duration: 300 },
        },
      })
      map.addSource("tokyo", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: tokyoRoute } },
            ...tokyoStops.map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates } })),
          ],
        },
      })
      map.addLayer({
        id: "tokyo-line",
        type: "line",
        source: "tokyo",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#0e1a36", "line-opacity": 0.4, "line-width": 4 },
        layout: { "line-cap": "round", "line-join": "miter", "line-miter-limit": 4 },
      })
      map.addLayer({
        id: "tokyo-dots",
        type: "circle",
        source: "tokyo",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 5, "circle-color": "#8a8f9c", "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 },
      })
      map.addSource("passport", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            ...passportArcs.map((coordinates) => ({ type: "Feature" as const, properties: { id: "" }, geometry: { type: "LineString" as const, coordinates } })),
            ...passportStamps.map((stamp) => ({ type: "Feature" as const, properties: { id: stamp.id }, geometry: { type: "Point" as const, coordinates: stamp.coord } })),
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
      map.on("click", "passport-dots", (event) => {
        const id = event.features?.[0]?.properties?.id
        if (id && isGlobe(latest.current.focus)) latest.current.onStamp(String(id))
      })
      map.on("mouseenter", "passport-dots", () => {
        if (isGlobe(latest.current.focus)) map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", "passport-dots", () => {
        map.getCanvas().style.cursor = ""
      })
      applyPalette(map, latest.current.palette)
      ready.current = true
      syncRoute(map, latest.current.focus, latest.current.showRoute)
      frame(map, latest.current.sheetTop, latest.current.focus)
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
    if (ready.current) syncRoute(map, focus, showRoute)
  }, [showRoute, focus])

  useEffect(() => {
    const highlighted = isDay(focus) ? key(dayFocus(focus).first) : null
    for (const [id, el] of stopRefs.current) el.classList.toggle("focus", id.endsWith(`@${highlighted}`))
    const map = mapRef.current
    if (map && ready.current) frame(map, sheetTop, focus)
  }, [sheetTop, focus, locateTick])

  return (
    <div className="map-wrap">
      <div ref={node} className="map" />
    </div>
  )
}

function syncRoute(map: maplibregl.Map, focus: MapFocus, showRoute: boolean) {
  const globe = isGlobe(focus)
  const vis = showRoute && !globe ? "visible" : "none"
  for (const id of ROUTE_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis)
  }
  for (const id of PASSPORT_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", globe || showRoute ? "visible" : "none")
  }
  const source = map.getSource("day-route") as maplibregl.GeoJSONSource | undefined
  source?.setData(dayData(focus))
  const day = isDay(focus)
  if (map.getLayer("route-day")) map.setPaintProperty("route-day", "line-color", day && !isPastDay(focus) && focus !== TODAY ? "#0e1a36" : "#2b59f0")
  if (map.getLayer("route-past")) map.setPaintProperty("route-past", "line-opacity", day ? 0.3 : 1)
  if (map.getLayer("route-future")) map.setPaintProperty("route-future", "line-opacity", day ? 0.2 : 0.4)
  if (map.getLayer("route-future-stops")) {
    map.setPaintProperty("route-future-stops", "circle-opacity", day ? 0.4 : 1)
    map.setPaintProperty("route-future-stops", "circle-stroke-opacity", day ? 0.4 : 1)
  }
}
