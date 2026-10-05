// Temporary screenshot page (map.html): the same basemap, style and palette as the prototype, without routes or markers.
// URL: /map.html?lng=…&lat=…&zoom=…  (the address bar follows the view, so a framing can be reopened later).
// Press H to hide the readout before taking a screenshot.
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"
import { currentPoint } from "./data"
import { STYLE_URL, applyPalette, daylight } from "./mapStyle"

maplibregl.setWorkerUrl(workerUrl)

const params = new URLSearchParams(location.search)
const num = (key: string, fallback: number) => {
  const value = Number(params.get(key))
  return params.has(key) && Number.isFinite(value) ? value : fallback
}

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: [num("lng", currentPoint[0]), num("lat", currentPoint[1])],
  zoom: num("zoom", 15),
  attributionControl: false,
  dragRotate: false,
  pitchWithRotate: false,
  fadeDuration: 0,
})
map.touchZoomRotate.disableRotation()

map.on("load", () => {
  map.setProjection({ type: "globe" })
  applyPalette(map, daylight)
})

const hud = document.getElementById("hud")!
const sync = () => {
  const { lng, lat } = map.getCenter()
  const zoom = map.getZoom()
  hud.textContent = `zoom ${zoom.toFixed(2)} · ${lat.toFixed(5)}, ${lng.toFixed(5)} · H hides this`
  history.replaceState(null, "", `?lng=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&zoom=${zoom.toFixed(2)}`)
}
map.on("moveend", sync)
map.on("load", sync)

window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") document.body.classList.toggle("clean")
})
