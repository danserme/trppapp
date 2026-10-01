// Fails if any map stop dot sits off the path line drawn for its day.
// Run: npm run check:dots
import { gapToPaths, type Point } from "../src/geo.ts"
import { buildPaths } from "../src/mapPaths.ts"

const TODAY = "tue"
const LIMIT = 0.5

const { lines, dots, markers, here } = buildPaths(TODAY)
const linesOf = (trip: string, day: string) =>
  lines.filter((line) => line.properties.trip === trip && line.properties.day === day).map((line) => line.geometry.coordinates)

type Row = { trip: string; day: string; what: string; gap: number }
const rows: Row[] = [
  ...dots.map((dot) => {
    const { trip, day, stop } = dot.properties
    return { trip, day, what: stop || "dot", gap: gapToPaths(dot.geometry.coordinates, linesOf(trip, day)) }
  }),
  ...markers.map((stop) => ({ trip: "lisbon", day: stop.day, what: stop.id, gap: gapToPaths(stop.at, linesOf("lisbon", stop.day)) })),
  { trip: "lisbon", day: TODAY, what: "here", gap: gapToPaths(here as Point, linesOf("lisbon", TODAY)) },
]

const missing = rows.filter((row) => !Number.isFinite(row.gap))
const off = rows.filter((row) => row.gap > LIMIT)
const byTrip = new Map<string, number[]>()
for (const row of rows) byTrip.set(row.trip, [...(byTrip.get(row.trip) ?? []), row.gap])
for (const [trip, gaps] of byTrip) console.log(trip.padEnd(10), `dots ${gaps.length}`.padEnd(9), `max ${Math.max(...gaps).toFixed(2)} m`)
for (const row of [...missing, ...off]) console.log("  off:", row.trip, row.day, row.what, `${row.gap.toFixed(1)} m`)
const bad = missing.length + off.length
console.log(bad ? `${bad} of ${rows.length} dots are off their path` : `all ${rows.length} dots are on their paths`)
process.exit(bad ? 1 : 0)
