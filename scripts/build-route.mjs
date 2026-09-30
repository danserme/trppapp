// Fetches street-following legs between trip stops and writes src/route.json.
// Run with: node scripts/build-route.mjs
import { writeFile } from "node:fs/promises"

const places = {
  airport: [-9.1342, 38.7742],
  hotel: [-9.137, 38.7105],
  comoba: [-9.1419, 38.7107],
  market: [-9.1459, 38.7068],
  lx: [-9.1789, 38.7034],
  catarina: [-9.1475, 38.7093],
  bairro: [-9.1445, 38.7132],
  tram: [-9.1359, 38.7159],
  ramiro: [-9.1355, 38.721],
  castelo: [-9.1335, 38.7139],
  museum: [-9.1328, 38.7102],
  spiga: [-9.1486, 38.7163],
  belem: [-9.216, 38.6916],
  pasteis: [-9.2033, 38.6975],
  maat: [-9.1941, 38.6957],
  river: [-9.14, 38.7068],
  fado: [-9.1262, 38.7127],
}

// Chronological stop sequence; ids match stops in data.ts.
const sequence = [
  ["mon", "flight-in", "airport"],
  ["mon", "mon-coffee", "comoba"],
  ["mon", "mon-market", "market"],
  ["mon", "mon-lx", "lx"],
  ["mon", "mon-view", "catarina"],
  ["mon", "mon-dinner", "bairro"],
  ["tue", "tue-breakfast", "hotel"],
  ["tue", "tue-tram", "tram"],
  ["tue", "tue-lunch", "ramiro"],
  ["tue", "tue-castle", "castelo"],
  ["tue", "museum", "museum"],
  ["tue", "hotel", "hotel"],
  ["tue", "tue-dinner", "spiga"],
  ["tue", "hotel-night", "hotel"],
  ["wed", "wed-belem", "belem"],
  ["wed", "wed-pasteis", "pasteis"],
  ["wed", "wed-maat", "maat"],
  ["wed", "wed-river", "river"],
  ["wed", "wed-fado", "fado"],
  ["thu", "flight-out", "airport"],
]

function distance([a, b], [c, d]) {
  const x = (c - a) * Math.cos(((b + d) / 2) * (Math.PI / 180)) * 111320
  const y = (d - b) * 110540
  return Math.hypot(x, y)
}

const meters = ([lng, lat]) => [lng * 87000, lat * 110540]

function offset(p, a, b) {
  const [px, py] = meters(p)
  const [ax, ay] = meters(a)
  const [bx, by] = meters(b)
  const len = Math.hypot(bx - ax, by - ay)
  if (len === 0) return Math.hypot(px - ax, py - ay)
  return Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len
}

function simplify(points, tolerance) {
  if (points.length < 3) return points
  const [first, last] = [points[0], points[points.length - 1]]
  let index = 0
  let max = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = offset(points[i], first, last)
    if (d > max) {
      max = d
      index = i
    }
  }
  if (max <= tolerance) return [first, last]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

async function leg(from, to) {
  if (from[0] === to[0] && from[1] === to[1]) return [from, to]
  const profile = distance(from, to) > 3200 ? "routed-car/route/v1/driving" : "routed-foot/route/v1/foot"
  const url = `https://routing.openstreetmap.de/${profile}/${from.join(",")};${to.join(",")}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const json = await res.json()
  const coords = json.routes?.[0]?.geometry?.coordinates ?? [from, to]
  return simplify(coords, 4).map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))])
}

const stops = {}
for (const [day, id, key] of sequence) stops[id] = { day, coord: places[key] }

const legs = []
for (let i = 0; i < sequence.length - 1; i++) {
  const [, fromId, fromKey] = sequence[i]
  const [, toId, toKey] = sequence[i + 1]
  const coords = await leg(places[fromKey], places[toKey])
  legs.push({ from: fromId, to: toId, day: sequence[i + 1][0], coords })
  await new Promise((resolve) => setTimeout(resolve, 250))
}

await writeFile(new URL("../src/route.json", import.meta.url), JSON.stringify({ order: sequence.map(([, id]) => id), stops, legs }))
console.log(legs.map((item) => `${item.from}->${item.to}: ${item.coords.length}`).join("\n"))
