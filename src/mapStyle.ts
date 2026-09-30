import type { Map as MapLibre } from "maplibre-gl"

export type Palette = {
  land: string
  water: string
  park: string
  road: string
  roadCase: string
  building: string
  label: string
  route: string
  routeFuture: string
}

export const daylight: Palette = {
  land: "#f5fbfd",
  water: "#c7e2f1",
  park: "#e3ecf5",
  road: "#dde4ec",
  roadCase: "#dde4ec",
  building: "#edf4f9",
  label: "#7c869b",
  route: "#2b59f0",
  routeFuture: "#0e1a36",
}

export const paper: Palette = {
  land: "#f3f0e8",
  water: "#d5e3ea",
  park: "#e5efe0",
  road: "#fffdf8",
  roadCase: "#e4ddd0",
  building: "#f7f4ee",
  label: "#7a7368",
  route: "#2b59f0",
  routeFuture: "#3d372e",
}

export const dusk: Palette = {
  land: "#d5deea",
  water: "#b9cfe4",
  park: "#d5e6dc",
  road: "#f7f9fc",
  roadCase: "#c5d0de",
  building: "#e7edf4",
  label: "#5c677c",
  route: "#123cff",
  routeFuture: "#0e1a36",
}

export const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

function paint(map: MapLibre, id: string, prop: string, value: string) {
  if (!map.getLayer(id)) return
  try {
    ;(map.setPaintProperty as (layer: string, name: string, paintValue: string) => void).call(map, id, prop, value)
  } catch {
    /* layer does not accept this paint prop */
  }
}

export function applyPalette(map: MapLibre, palette: Palette) {
  const layers = map.getStyle()?.layers ?? []
  for (const layer of layers) {
    const id = layer.id
    if (id.startsWith("route-") || id.startsWith("stop-")) continue
    if (id === "background") {
      paint(map, id, "background-color", palette.land)
      continue
    }
    if (id.startsWith("park")) {
      paint(map, id, "fill-color", palette.park)
      continue
    }
    if (id === "water" || id === "water_shadow" || id.startsWith("waterway") || id.startsWith("watername")) {
      paint(map, id, "fill-color", palette.water)
      paint(map, id, "line-color", palette.water)
      paint(map, id, "text-color", palette.label)
      continue
    }
    if (id.startsWith("landcover") || id.startsWith("landuse")) {
      paint(map, id, "fill-color", palette.land)
      continue
    }
    if (id.startsWith("building")) {
      paint(map, id, "fill-color", palette.building)
      paint(map, id, "fill-outline-color", palette.building)
      continue
    }
    if (id.includes("_fill") || id === "road_path" || id === "bridge_path" || id === "tunnel_path") {
      paint(map, id, "line-color", palette.road)
      continue
    }
    if (id.includes("_case") || id.startsWith("boundary") || id.startsWith("rail") || id.startsWith("aeroway")) {
      paint(map, id, "line-color", palette.roadCase)
      continue
    }
    if (layer.type === "symbol") {
      map.setLayoutProperty(id, "visibility", "none")
    }
  }
  paint(map, "route-past", "line-color", palette.route)
  paint(map, "route-future", "line-color", palette.routeFuture)
}
