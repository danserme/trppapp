import { awayPlans, currentPoint, dayRoute, days, futureStops, isPastTrip, mapStops, stops, type DayId, type TripId } from "./data"
import { smoothPath, snapToPaths, type Point } from "./geo"

export type AwayTrip = Exclude<TripId, "lisbon">
export const awayEntries = Object.entries(awayPlans) as [AwayTrip, (typeof awayPlans)["tokyo"]][]

// Away plans list one point per non-gap card, in card order.
const awayStopIds = (day: DayId) => (stops[day] ?? []).filter((stop) => stop.kind !== "gap").map((stop) => stop.id)

// Dots are snapped onto the drawn (simplified, rounded) line of their day, so they never float beside it.
export function buildPaths(today: DayId) {
  const lisbonLegs = days.flatMap((day) => dayRoute(day.id).map((leg) => ({ day: day.id, future: leg.future, coords: smoothPath(leg.coords) })))
  const awayLines = awayEntries.flatMap(([trip, plans]) => plans.map((plan) => ({ trip, plan, coords: smoothPath(plan.path) })))
  const lisbonPaths = (day: DayId) => lisbonLegs.filter((leg) => leg.day === day).map((leg) => leg.coords)
  const onLisbon = (coord: Point, day: DayId) => snapToPaths(coord, lisbonPaths(day))

  const line = (trip: TripId, day: DayId, future: boolean, rest: boolean, coordinates: Point[]) => ({
    type: "Feature" as const,
    properties: { trip, day, future, rest },
    geometry: { type: "LineString" as const, coordinates },
  })
  const dot = (trip: TripId, day: DayId, future: boolean, coordinates: Point, stop = "") => ({
    type: "Feature" as const,
    properties: { trip, day, future, stop },
    geometry: { type: "Point" as const, coordinates },
  })

  const dots = [
    ...futureStops.map((stop) => dot("lisbon", stop.day, true, onLisbon(stop.coord, stop.day), stop.id)),
    ...awayLines.flatMap(({ trip, plan, coords }) =>
      plan.stops.map((coord, index) => dot(trip, plan.day, !isPastTrip(trip), snapToPaths(coord, [coords]), awayStopIds(plan.day)[index])),
    ),
  ]
  const markers = mapStops.map((stop) => ({ ...stop, at: onLisbon(stop.coord, stop.day) }))
  const here = onLisbon(currentPoint, today)
  const spots = new Map<string, Point>([
    ...dots.filter((item) => item.properties.stop).map((item) => [stopKey(item.properties.day, item.properties.stop), item.geometry.coordinates] as const),
    ...markers.map((stop) => [stopKey(stop.day, stop.id), stop.at] as const),
    [stopKey(today, "hotel"), here],
  ])

  return {
    lines: [
      ...lisbonLegs.map((leg) => line("lisbon", leg.day, leg.future, leg.future || leg.day === today, leg.coords)),
      ...awayLines.map(({ trip, plan, coords }) => line(trip, plan.day, !isPastTrip(trip), true, coords)),
    ],
    dots,
    markers,
    here,
    spots,
  }
}

export const stopKey = (day: string, id: string) => `${day}/${id}`

let cached: ReturnType<typeof buildPaths> | null = null
export const mapPaths = (today: DayId) => (cached ??= buildPaths(today))
