// Fetches street-following paths for every non-Lisbon trip day and writes src/away-routes.json.
// Run with: node scripts/build-away-routes.mjs
import { writeFile } from "node:fs/promises"
import { awayStops } from "../src/data.ts"

const meters = ([lng, lat], refLat) => [lng * 111320 * Math.cos((refLat * Math.PI) / 180), lat * 110540]

function distance(a, b) {
  const [ax, ay] = meters(a, a[1])
  const [bx, by] = meters(b, a[1])
  return Math.hypot(bx - ax, by - ay)
}

function simplify(points, tolerance) {
  if (points.length < 3) return points
  const [first, last] = [points[0], points[points.length - 1]]
  const [ax, ay] = meters(first, first[1])
  const [bx, by] = meters(last, first[1])
  const span = Math.hypot(bx - ax, by - ay) || 1
  let index = 0
  let max = 0
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = meters(points[i], first[1])
    const off = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / span
    if (off > max) [max, index] = [off, i]
  }
  if (max <= tolerance) return [first, last]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

async function leg(from, to) {
  if (from[0] === to[0] && from[1] === to[1]) return [from, to]
  const length = distance(from, to)
  const profile = length > 3200 ? "routed-car/route/v1/driving" : "routed-foot/route/v1/foot"
  const url = `https://routing.openstreetmap.de/${profile}/${from.join(",")};${to.join(",")}?overview=full&geometries=geojson`
  const json = await (await fetch(url)).json()
  const coords = json.routes?.[0]?.geometry?.coordinates ?? [from, to]
  // Long drives keep only the bends that read at city or region zoom.
  const tolerance = Math.max(30, length * 0.004)
  return simplify([from, ...coords, to], tolerance).map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))])
}

const out = {}
for (const plans of Object.values(awayStops)) {
  for (const plan of plans) {
    const path = []
    for (let i = 0; i < plan.path.length - 1; i++) {
      const coords = await leg(plan.path[i], plan.path[i + 1])
      path.push(...(i === 0 ? coords : coords.slice(1)))
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    out[plan.day] = path
    console.log(`${plan.day}: ${plan.path.length} stops -> ${path.length} points`)
  }
}

await writeFile(new URL("../src/away-routes.json", import.meta.url), JSON.stringify(out))
