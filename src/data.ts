import routeJson from "./route.json"

export type Person = {
  id: string
  name: string
  photo: string
  shape: "stamp" | "circle"
}

export const people: Record<string, Person> = {
  ari: { id: "ari", name: "Ari", photo: "/assets/avatars/glasses.png", shape: "circle" },
  john: { id: "john", name: "John Doe", photo: "/assets/people/john.jpg", shape: "circle" },
  ben: { id: "ben", name: "Ben Rucola", photo: "/assets/people/ben.jpg", shape: "circle" },
  irene: { id: "irene", name: "Irene Mente", photo: "/assets/people/irene.jpg", shape: "circle" },
  ivan: { id: "ivan", name: "Ivan Crispy", photo: "/assets/avatars/side.png", shape: "circle" },
  nic: { id: "nic", name: "Nic Kruse", photo: "/assets/avatars/dark.png", shape: "circle" },
  menta: { id: "menta", name: "Sara Menta", photo: "/assets/people/sara.jpg", shape: "circle" },
  martina: { id: "martina", name: "Martina Bella", photo: "/assets/people/martina.jpg", shape: "circle" },
  maria: { id: "maria", name: "Maria Kliger", photo: "/assets/people/maria.jpg", shape: "circle" },
  doris: { id: "doris", name: "Doris Meng", photo: "/assets/people/doris.jpg", shape: "circle" },
  nastya: { id: "nastya", name: "Nastya Mint", photo: "/assets/people/nastya.jpg", shape: "circle" },
  ren: { id: "ren", name: "Ren Montefusco", photo: "/assets/avatars/man.png", shape: "circle" },
}

export const initialMembers = ["john", "ben", "irene", "menta"]
export const friends = ["martina", "maria", "doris", "nastya"]
export const groupSize = initialMembers.length + 1

export type Place = {
  id: string
  name: string
  detail: string
  rating: string
  photo: string
}

export const savedPlaces: Place[] = [
  {
    id: "spiga",
    name: "Pizzeria La Spiga",
    detail: "Small pizzeria by Italian chef",
    rating: "5",
    photo: "/assets/food/spiga.jpg",
  },
  {
    id: "elevada",
    name: "Elevada",
    detail: "The real Lisbon’s gem",
    rating: "4.7",
    photo: "/assets/food/elevada.jpg",
  },
  {
    id: "ribatejo",
    name: "Ribatejo",
    detail: "Royal experience",
    rating: "4.6",
    photo: "/assets/food/ribatejo.jpg",
  },
]

export type PollOption = {
  id: string
  votes: string[]
  name?: string
}

export type Poll = {
  question: string
  from: string
  to: string
  date: string
  options: PollOption[]
  showVoters: boolean
  multiple: boolean
  allowAdd: boolean
  revoting: boolean
  anchorStopId?: string
  revealed?: boolean
  decided?: boolean
}

export const tuesdayPoll: Poll = {
  question: "What should we eat for dinner?",
  from: "20.00",
  to: "22.00",
  date: "06/10/26",
  showVoters: true,
  multiple: false,
  allowAdd: false,
  revoting: false,
  revealed: true,
  options: [
    { id: "spiga", votes: ["ari", "john"] },
    { id: "elevada", votes: ["irene"] },
    { id: "ribatejo", votes: ["menta"] },
  ],
}

export type DayId = "mon" | "tue" | "wed" | "thu" | "tk1" | "tk2" | "tk3" | "tk4"
export type TripId = "lisbon" | "tokyo"
export type Day = { id: DayId; dow: string; date: string; label: string; progress: number }

export const days: Day[] = [
  { id: "mon", dow: "Mo", date: "5 Oct", label: "05/10/26", progress: 1 },
  { id: "tue", dow: "Tu", date: "6 Oct", label: "06/10/26", progress: 49 / 72.5 },
  { id: "wed", dow: "We", date: "7 Oct", label: "07/10/26", progress: 0 },
  { id: "thu", dow: "Th", date: "8 Oct", label: "08/10/26", progress: 0 },
]

export const tokyoDays: Day[] = [
  { id: "tk1", dow: "We", date: "11 Nov", label: "11/11/26", progress: 0 },
  { id: "tk2", dow: "Th", date: "12 Nov", label: "12/11/26", progress: 0 },
  { id: "tk3", dow: "Fr", date: "13 Nov", label: "13/11/26", progress: 0 },
  { id: "tk4", dow: "Sa", date: "14 Nov", label: "14/11/26", progress: 0 },
]

export const tripDays = (trip: TripId) => (trip === "tokyo" ? tokyoDays : days)

export type Stop = {
  id: string
  time: string
  tone: "now" | "muted"
  status: string
  title: string
  people: string[]
  kind?: "flight" | "gap" | "food" | "visit"
  afterPoll?: boolean
  bill?: boolean
}

export const stops: Record<DayId, Stop[]> = {
  mon: [
    { id: "flight-in", time: "09.40–11.10", tone: "muted", status: "landed", title: "Flight to Lisbon", people: ["ari", "john", "ben"], kind: "flight" },
    { id: "mon-coffee", time: "11.40–12.20", tone: "muted", status: "coffee", title: "Comoba", people: ["ari", "irene"], },
    { id: "mon-market", time: "12.40–14.10", tone: "muted", status: "lunch", title: "Time Out Market", people: ["john", "ben", "ari"], },
    { id: "mon-gap", time: "14.30–16.00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "mon-lx", time: "16.20–18.00", tone: "muted", status: "wander", title: "LX Factory", people: ["menta", "ben"], },
    { id: "mon-view", time: "18.30–19.40", tone: "muted", status: "sunset", title: "Santa Catarina", people: ["ari", "ben"], },
    { id: "mon-dinner", time: "20.10–22.00", tone: "muted", status: "dinner", title: "Bairro Alto", people: ["john", "irene", "menta"], kind: "food" },
  ],
  tue: [
    { id: "tue-breakfast", time: "08.30–09.20", tone: "muted", status: "breakfast", title: "Hotel breakfast", people: ["ari", "john"], },
    { id: "tue-tram", time: "10.00–11.20", tone: "muted", status: "ride", title: "Tram 28", people: ["ben", "irene", "ari"], },
    { id: "tue-lunch", time: "12.00–13.20", tone: "muted", status: "lunch", title: "Cervejaria Ramiro", people: ["john", "menta"], kind: "food", bill: true },
    { id: "tue-castle", time: "13.40–14.40", tone: "muted", status: "visit", title: "Castelo de São Jorge", people: ["ari", "ben"], },
    { id: "museum", time: "15.00–17.00", tone: "muted", status: "visit", title: "Museum of Arts", people: ["irene", "ari"], },
    { id: "hotel", time: "17.00–20.00", tone: "now", status: "resting", title: "Hotel Da Baixa", people: ["john", "ben", "ari"] },
    { id: "hotel-night", time: "22.30–08.00", tone: "muted", status: "resting", title: "Hotel Da Baixa", people: ["john", "ben", "ari"], afterPoll: true },
  ],
  wed: [
    { id: "wed-belem", time: "09.30–11.20", tone: "muted", status: "visit", title: "Belém Tower", people: ["ari", "john", "ben"], },
    { id: "wed-pasteis", time: "11.40–12.30", tone: "muted", status: "sweet", title: "Pastéis de Belém", people: ["irene", "menta"], kind: "food" },
    { id: "wed-gap", time: "13.00–15.00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "wed-maat", time: "15.30–17.20", tone: "muted", status: "visit", title: "MAAT", people: ["menta", "ari"], },
    { id: "wed-river", time: "18.00–19.20", tone: "muted", status: "walk", title: "Riverfront", people: ["ben", "john"], },
    { id: "wed-fado", time: "20.30–22.30", tone: "muted", status: "fado", title: "Mesa de Frades", people: ["ari", "irene"], kind: "food" },
  ],
  thu: [
    { id: "flight-out", time: "10.30–12.40", tone: "muted", status: "depart", title: "Flight home", people: ["ari", "ben"], kind: "flight" },
  ],
  tk1: [
    { id: "tk-flight", time: "07.55–09.40", tone: "muted", status: "landing", title: "Flight to Tokyo", people: ["ari", "john", "ben"], kind: "flight" },
    { id: "tk-hotel", time: "15.00–16.00", tone: "muted", status: "check-in", title: "Hotel Gracery Shinjuku", people: ["ari", "john", "ben", "irene"] },
    { id: "tk-ramen", time: "19.30–21.00", tone: "muted", status: "dinner", title: "Fuunji Ramen", people: ["ari", "ben"], kind: "food" },
  ],
  tk2: [
    { id: "tk-meiji", time: "09.30–11.00", tone: "muted", status: "visit", title: "Meiji Jingu", people: ["ari", "irene"] },
    { id: "tk-gap", time: "11.30–15.00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "tk-shibuya", time: "18.00–20.00", tone: "muted", status: "walk", title: "Shibuya Crossing", people: ["ari", "john", "ben"] },
  ],
  tk3: [
    { id: "tk-tsukiji", time: "08.00–10.00", tone: "muted", status: "breakfast", title: "Tsukiji Outer Market", people: ["ari", "john"], kind: "food" },
    { id: "tk-teamlab", time: "13.00–15.00", tone: "muted", status: "visit", title: "teamLab Planets", people: ["ari", "irene", "ben"] },
  ],
  tk4: [
    { id: "tk-flight-out", time: "11.20–17.35", tone: "muted", status: "depart", title: "Flight home", people: ["ari", "john", "ben"], kind: "flight" },
  ],
}

export const tokyoRoute: [number, number][] = [
  [139.7006, 35.6938],
  [139.7003, 35.6905],
  [139.6993, 35.6764],
  [139.7016, 35.6702],
  [139.7005, 35.6595],
  [139.7456, 35.6631],
  [139.7707, 35.6655],
  [139.7838, 35.6491],
]
export const tokyoStops: [number, number][] = [
  [139.7006, 35.6938],
  [139.6993, 35.6764],
  [139.7005, 35.6595],
  [139.7707, 35.6655],
  [139.7838, 35.6491],
]

export type Expense = {
  id: string
  day: string
  order: number
  title: string
  amount: number
  split: number
  paidBy: string
}

export const initialExpenses: Expense[] = [
  { id: "e12", day: "Tu, 6 Oct", order: 26, title: "Museum of Arts", amount: 120, split: 3, paidBy: "you" },
  { id: "e11", day: "Tu, 6 Oct", order: 25, title: "Castelo de São Jorge", amount: 60, split: 4, paidBy: "ben" },
  { id: "e10", day: "Tu, 6 Oct", order: 24, title: "Cervejaria Ramiro", amount: 186, split: 3, paidBy: "you" },
  { id: "e13", day: "Tu, 6 Oct", order: 23, title: "Tram 28 tickets", amount: 21, split: 7, paidBy: "irene" },
  { id: "e21", day: "Mo, 5 Oct", order: 16, title: "Bairro Alto dinner", amount: 164, split: 3, paidBy: "you" },
  { id: "e22", day: "Mo, 5 Oct", order: 15, title: "LX Factory drinks", amount: 42, split: 2, paidBy: "menta" },
  { id: "e23", day: "Mo, 5 Oct", order: 14, title: "Time Out Market", amount: 96, split: 3, paidBy: "you" },
  { id: "e24", day: "Mo, 5 Oct", order: 13, title: "Comoba", amount: 18, split: 2, paidBy: "irene" },
  { id: "e20", day: "Mo, 5 Oct", order: 12, title: "Hotel Da Baixa", amount: 612, split: 7, paidBy: "john" },
  { id: "e25", day: "Mo, 5 Oct", order: 11, title: "Airport taxi", amount: 38, split: 3, paidBy: "you" },
]

export const billItems = [
  { id: "diavola", name: "Pizza Diavola", qty: 3, price: 14 },
  { id: "marinara", name: "Pizza Marinara", qty: 3, price: 14 },
  { id: "lugnana", name: "Bottle of Lugnana", qty: 2, price: 25 },
  { id: "water", name: "Still water", qty: 7, price: 2 },
]

export const expenseSummary = {
  owed: 235,
  owedBy: [
    { id: "ben", amount: 115 },
    { id: "menta", amount: 120 },
  ],
}

export type Trip = {
  id: string
  title: string
  dates: string
  when: "past" | "current" | "upcoming"
  extra: number
  people: string[]
  stamps: number
  progress?: string
  left?: string
  next?: { title: string; time: string }
}

export const trips: Trip[] = [
  {
    id: "amsterdam",
    title: "Concert in Amsterdam",
    dates: "8 Mar – 10 Mar, 2025",
    when: "past",
    extra: 5,
    people: ["john", "ben", "irene"],
    stamps: 4,
  },
  {
    id: "munich",
    title: "Munich",
    dates: "3 Aug – 12 Aug, 2026",
    when: "past",
    extra: 2,
    people: ["john", "ben"],
    stamps: 4,
  },
  {
    id: "lisbon",
    title: "Exploring Lisbon",
    dates: "5 Oct – 8 Oct, 2026",
    when: "current",
    extra: 3,
    people: ["john", "ben"],
    stamps: 1,
    progress: "Day 2 of 4",
    left: "2 days left",
    next: { title: "Hotel Da Baixa", time: "22.30–08.00" },
  },
  {
    id: "tokyo",
    title: "Tokyo",
    dates: "11 Nov – 14 Nov, 2026",
    when: "upcoming",
    extra: 5,
    people: ["john", "ben", "irene"],
    stamps: 0,
  },
]

export const inviteLink = "https://trip.up/i/lisbon-hd"

export type Stamp = {
  id: string
  city: string
  country: string
  date: string
  coord: [number, number]
  tilt: number
  image: string
  photos: string[]
}

const lisbonPhotos = ["/assets/hotel-baixa.png", "/assets/food/elevada.jpg", "/assets/food/spiga.jpg", "/assets/food/ribatejo.jpg", "/assets/home/map-shot.png"]

export const passportStamps: Stamp[] = [
  { id: "amsterdam", city: "Amsterdam", country: "Netherlands", date: "Mar 2025", coord: [4.9041, 52.3676], tilt: 6, image: "/assets/passport/stamp-1.png", photos: ["/assets/passport/stamp-1.png", "/assets/food/ribatejo.jpg", "/assets/food/elevada.jpg"] },
  { id: "rotterdam", city: "Rotterdam", country: "Netherlands", date: "Mar 2025", coord: [4.4777, 51.9244], tilt: 0, image: "/assets/passport/stamp-2.png", photos: ["/assets/passport/stamp-2.png", "/assets/food/spiga.jpg"] },
  { id: "munich", city: "Munich", country: "Germany", date: "Aug 2026", coord: [11.582, 48.1351], tilt: 6, image: "/assets/passport/stamp-3.png", photos: ["/assets/passport/stamp-3.png", "/assets/food/ribatejo.jpg", "/assets/food/spiga.jpg", "/assets/food/elevada.jpg"] },
  { id: "berlin", city: "Berlin", country: "Germany", date: "Aug 2026", coord: [13.405, 52.52], tilt: -3.49, image: "/assets/passport/stamp-4.png", photos: ["/assets/passport/stamp-4.png", "/assets/food/elevada.jpg"] },
  { id: "porto", city: "Porto", country: "Portugal", date: "Oct 2026", coord: [-8.6291, 41.1579], tilt: 0, image: "/assets/passport/stamp-1.png", photos: ["/assets/passport/stamp-1.png", "/assets/food/spiga.jpg", "/assets/food/ribatejo.jpg"] },
  { id: "lisbon", city: "Lisbon", country: "Portugal", date: "Oct 2026", coord: [-9.1393, 38.7223], tilt: 5, image: "/assets/stamp-big.png", photos: lisbonPhotos },
]

type LngLat = [number, number]
type RouteData = {
  order: string[]
  stops: Record<string, { day: DayId; coord: LngLat }>
  legs: { from: string; to: string; day: DayId; coords: LngLat[] }[]
}

const route = routeJson as unknown as RouteData
const nowIndex = route.order.indexOf("hotel")
const join = (legs: RouteData["legs"]) => legs.flatMap((leg, index) => (index === 0 ? leg.coords : leg.coords.slice(1)))

function onPath(id: string): LngLat {
  const leaving = route.legs.find((leg) => leg.from === id)
  if (leaving) return leaving.coords[0]
  const arriving = route.legs.find((leg) => leg.to === id)
  return arriving ? arriving.coords[arriving.coords.length - 1] : route.stops[id].coord
}

export const currentPoint: LngLat = onPath("hotel")
export const pastRoute = join(route.legs.slice(0, nowIndex))
export const futureRoute = join(route.legs.slice(nowIndex))
export const tripCoords = [...pastRoute, ...futureRoute]


const key = ([lng, lat]: LngLat) => `${lng},${lat}`
const isFlight = (leg: RouteData["legs"][number]) => leg.from.startsWith("flight") || leg.to.startsWith("flight")

export function dayRoute(day: DayId): LngLat[][] {
  return route.legs.filter((leg) => leg.day === day && !isFlight(leg)).map((leg) => leg.coords)
}

export const mapStops: { id: string; coord: LngLat; past: boolean }[] = route.order
  .map((id, index) => ({ id, coord: onPath(id), past: index < nowIndex }))
  .filter((item, index, list) => key(item.coord) !== key(currentPoint) && list.findIndex((other) => key(other.coord) === key(item.coord)) === index)

export function dayFocus(day: DayId) {
  const ids = route.order.filter((id) => route.stops[id].day === day)
  const local = ids.filter((id) => !id.startsWith("flight"))
  const focus = local.length ? local : ids
  const legs = route.legs.filter((leg) => leg.day === day && !isFlight(leg))
  return {
    firstId: focus[0],
    first: onPath(focus[0]),
    coords: [...focus.map((id) => onPath(id)), ...legs.flatMap((leg) => leg.coords)],
  }
}

function arc([x1, y1]: LngLat, [x2, y2]: LngLat): LngLat[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const bend = 0.22
  const cx = (x1 + x2) / 2 - dy * bend
  const cy = (y1 + y2) / 2 + dx * bend
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32
    const u = 1 - t
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2] as LngLat
  })
}

export const passportArcs: LngLat[][] = passportStamps.slice(1).map((stamp, index) => arc(passportStamps[index].coord, stamp.coord))
