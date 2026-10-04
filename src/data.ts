import routeJson from "./route.json" with { type: "json" }
import awayRoutes from "./away-routes.json" with { type: "json" }

export type Person = {
  id: string
  name: string
  tag: string
  photo: string
  shape: "stamp" | "circle"
}

export const people: Record<string, Person> = {
  ari: { id: "ari", name: "Ari", tag: "@ari.mendoza", photo: "/assets/avatars/glasses.png", shape: "circle" },
  john: { id: "john", name: "John Doe", tag: "@johndoe", photo: "/assets/people/john.jpg", shape: "circle" },
  ben: { id: "ben", name: "Ben Rucola", tag: "@ben.rucola", photo: "/assets/people/ben.jpg", shape: "circle" },
  irene: { id: "irene", name: "Irene Mente", tag: "@irene.mente", photo: "/assets/people/irene.jpg", shape: "circle" },
  ivan: { id: "ivan", name: "Ivan Crispy", tag: "@ivancrispy", photo: "/assets/avatars/side.png", shape: "circle" },
  nic: { id: "nic", name: "Nic Kruse", tag: "@nic.kruse", photo: "/assets/avatars/dark.png", shape: "circle" },
  menta: { id: "menta", name: "Sara Menta", tag: "@saramenta", photo: "/assets/people/sara.jpg", shape: "circle" },
  martina: { id: "martina", name: "Martina Bella", tag: "@martina.bella", photo: "/assets/people/martina.jpg", shape: "circle" },
  maria: { id: "maria", name: "Maria Kliger", tag: "@mariakliger", photo: "/assets/people/maria.jpg", shape: "circle" },
  doris: { id: "doris", name: "Doris Meng", tag: "@doris.meng", photo: "/assets/people/doris.jpg", shape: "circle" },
  nastya: { id: "nastya", name: "Nastya Mint", tag: "@nastya.mint", photo: "/assets/people/nastya.jpg", shape: "circle" },
  ren: { id: "ren", name: "Ren Montefusco", tag: "@ren.montefusco", photo: "/assets/people/ren.jpg", shape: "circle" },
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
  status?: string
}

export const activityTypes = ["wander", "walk", "visit", "coffee", "breakfast", "lunch", "dinner", "drinks", "sunset", "ride", "night"]

export const tuesdayPoll: Poll = {
  question: "What should we eat for dinner?",
  status: "dinner",
  from: "20:00",
  to: "22:00",
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

export type DayId = string
export type TripId = "lisbon" | "tokyo" | "amsterdam" | "munich" | "porto" | "paris"
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

const done = (id: string, dow: string, date: string, label: string): Day => ({ id, dow, date, label, progress: 1 })

export const pastDays: Record<Exclude<TripId, "lisbon" | "tokyo">, Day[]> = {
  amsterdam: [done("am1", "Sa", "8 Mar", "08/03/25"), done("am2", "Su", "9 Mar", "09/03/25"), done("am3", "Mo", "10 Mar", "10/03/25")],
  munich: [
    done("mu1", "Mo", "3 Aug", "03/08/26"),
    done("mu2", "Tu", "4 Aug", "04/08/26"),
    done("mu3", "We", "5 Aug", "05/08/26"),
    done("mu4", "Th", "6 Aug", "06/08/26"),
    done("mu5", "Fr", "7 Aug", "07/08/26"),
    done("mu6", "Sa", "8 Aug", "08/08/26"),
    done("mu7", "Su", "9 Aug", "09/08/26"),
    done("mu8", "Mo", "10 Aug", "10/08/26"),
    done("mu9", "Tu", "11 Aug", "11/08/26"),
    done("mu10", "We", "12 Aug", "12/08/26"),
  ],
  porto: [
    done("po1", "Fr", "18 Sep", "18/09/26"),
    done("po2", "Sa", "19 Sep", "19/09/26"),
    done("po3", "Su", "20 Sep", "20/09/26"),
    done("po4", "Mo", "21 Sep", "21/09/26"),
    done("po5", "Tu", "22 Sep", "22/09/26"),
  ],
  paris: [done("pa1", "Fr", "25 Sep", "25/09/26"), done("pa2", "Sa", "26 Sep", "26/09/26"), done("pa3", "Su", "27 Sep", "27/09/26")],
}

export const isPastTrip = (trip: TripId): trip is keyof typeof pastDays => trip in pastDays
export const tripDays = (trip: TripId) => (trip === "tokyo" ? tokyoDays : isPastTrip(trip) ? pastDays[trip] : days)

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

const at = (id: string, time: string, status: string, title: string, people: string[], kind?: Stop["kind"]): Stop => ({
  id,
  time,
  tone: "muted",
  status,
  title,
  people,
  ...(kind ? { kind } : {}),
})

export const stops: Record<DayId, Stop[]> = {
  mon: [
    { id: "flight-in", time: "09:40–11:10", tone: "muted", status: "ride", title: "Flight to Lisbon", people: ["ari", "john", "ben"], kind: "flight" },
    { id: "mon-coffee", time: "11:40–12:20", tone: "muted", status: "coffee", title: "Comoba", people: ["ari", "irene"], },
    { id: "mon-market", time: "12:40–14:10", tone: "muted", status: "lunch", title: "Time Out Market", people: ["john", "ben", "ari"], },
    { id: "mon-gap", time: "14:30–16:00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "mon-lx", time: "16:20–18:00", tone: "muted", status: "wander", title: "LX Factory", people: ["menta", "ben"], },
    { id: "mon-view", time: "18:30–19:40", tone: "muted", status: "sunset", title: "Santa Catarina", people: ["ari", "ben"], },
    { id: "mon-dinner", time: "20:10–22:00", tone: "muted", status: "dinner", title: "Bairro Alto", people: ["john", "irene", "menta"], kind: "food" },
  ],
  tue: [
    { id: "tue-breakfast", time: "08:30–09:20", tone: "muted", status: "breakfast", title: "Hotel breakfast", people: ["ari", "john"], },
    { id: "tue-tram", time: "10:00–11:20", tone: "muted", status: "ride", title: "Tram 28", people: ["ben", "irene", "ari"], },
    { id: "tue-lunch", time: "12:00–13:20", tone: "muted", status: "lunch", title: "Cervejaria Ramiro", people: ["john", "menta"], kind: "food", bill: true },
    { id: "tue-castle", time: "13:40–14:40", tone: "muted", status: "visit", title: "Castelo de São Jorge", people: ["ari", "ben"], },
    { id: "museum", time: "15:00–17:00", tone: "muted", status: "visit", title: "Museum of Arts", people: ["irene", "ari"], },
    { id: "hotel", time: "17:00–20:00", tone: "now", status: "visit", title: "Hotel Da Baixa", people: ["john", "ben", "ari"] },
    { id: "hotel-night", time: "22:30–08:00", tone: "muted", status: "night", title: "Hotel Da Baixa", people: ["john", "ben", "ari"], afterPoll: true },
  ],
  wed: [
    { id: "wed-belem", time: "09:30–11:20", tone: "muted", status: "visit", title: "Belém Tower", people: ["ari", "john", "ben"], },
    { id: "wed-pasteis", time: "11:40–12:30", tone: "muted", status: "coffee", title: "Pastéis de Belém", people: ["irene", "menta"], kind: "food" },
    { id: "wed-gap", time: "13:00–15:00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "wed-maat", time: "15:30–17:20", tone: "muted", status: "visit", title: "MAAT", people: ["menta", "ari"], },
    { id: "wed-river", time: "18:00–19:20", tone: "muted", status: "walk", title: "Riverfront", people: ["ben", "john"], },
    { id: "wed-fado", time: "20:30–22:30", tone: "muted", status: "dinner", title: "Mesa de Frades", people: ["ari", "irene"], kind: "food" },
  ],
  thu: [
    { id: "flight-out", time: "10:30–12:40", tone: "muted", status: "ride", title: "Flight home", people: ["ari", "ben"], kind: "flight" },
  ],
  tk1: [
    { id: "tk-flight", time: "09:55–11:30", tone: "muted", status: "ride", title: "Arrive at Haneda", people: ["ari", "john", "ben"], kind: "flight" },
    { id: "tk-hotel", time: "15:00–16:00", tone: "muted", status: "visit", title: "Hotel Gracery Shinjuku", people: ["ari", "john", "ben", "irene"] },
    { id: "tk-ramen", time: "19:30–21:00", tone: "muted", status: "dinner", title: "Fuunji Ramen", people: ["ari", "ben"], kind: "food" },
  ],
  tk2: [
    { id: "tk-meiji", time: "09:30–11:00", tone: "muted", status: "visit", title: "Meiji Jingu", people: ["ari", "irene"] },
    { id: "tk-gap", time: "11:30–15:00", tone: "muted", status: "open", title: "Afternoon", people: [], kind: "gap" },
    { id: "tk-shibuya", time: "18:00–20:00", tone: "muted", status: "walk", title: "Shibuya Crossing", people: ["ari", "john", "ben"] },
  ],
  tk3: [
    { id: "tk-tsukiji", time: "08:00–10:00", tone: "muted", status: "breakfast", title: "Tsukiji Outer Market", people: ["ari", "john"], kind: "food" },
    { id: "tk-teamlab", time: "13:00–15:00", tone: "muted", status: "visit", title: "teamLab Planets", people: ["ari", "irene", "ben"] },
  ],
  tk4: [
    { id: "tk-flight-out", time: "11:20–17:35", tone: "muted", status: "ride", title: "Flight home", people: ["ari", "john", "ben"], kind: "flight" },
  ],
  am1: [
    at("am1-coffee", "10:00–10:40", "coffee", "Back to Black", ["ari", "irene"]),
    at("am1-train", "11:10–11:50", "ride", "Train to Rotterdam", ["ari", "john", "ben", "irene"]),
    at("am1-markthal", "12:10–13:30", "lunch", "Markthal", ["john", "ben"], "food"),
    at("am1-bridge", "14:00–16:00", "walk", "Erasmus Bridge", ["ari", "irene"]),
    at("am1-dinner", "19:30–21:30", "dinner", "Fenix Food Factory", ["john", "ben", "irene"], "food"),
  ],
  am2: [
    at("am2-rijks", "10:30–12:30", "visit", "Rijksmuseum", ["ari", "irene"]),
    at("am2-lunch", "13:00–14:00", "lunch", "Foodhallen", ["ari", "john", "ben"], "food"),
    at("am2-gap", "14:30–17:30", "open", "Afternoon", [], "gap"),
    at("am2-concert", "20:30–23:30", "night", "Concert at Ziggo Dome", ["ari", "john", "ben", "irene"]),
  ],
  am3: [
    at("am3-brunch", "10:00–11:30", "breakfast", "Pluk", ["ari", "john"], "food"),
    at("am3-park", "12:00–13:30", "walk", "Vondelpark", ["irene", "ben"]),
    at("am3-bye", "15:00–15:30", "ride", "Amsterdam Centraal", ["ari", "john", "ben", "irene"]),
  ],
  mu1: [
    at("mu1-flight", "08:05–09:25", "ride", "Flight to Munich", ["ari", "john", "ben"], "flight"),
    at("mu1-hotel", "11:00–11:30", "visit", "Louis Hotel", ["ari", "john", "ben"]),
    at("mu1-square", "13:00–15:00", "wander", "Marienplatz", ["ari", "ben"]),
    at("mu1-dinner", "18:30–21:00", "dinner", "Augustiner-Keller", ["ari", "john", "ben"], "food"),
  ],
  mu2: [
    at("mu2-museum", "10:00–13:00", "visit", "Deutsches Museum", ["ari", "john"]),
    at("mu2-garden", "14:00–17:00", "walk", "Englischer Garten", ["ari", "john", "ben"]),
    at("mu2-dinner", "19:00–21:00", "dinner", "Hofbräuhaus", ["john", "ben"], "food"),
  ],
  mu3: [
    at("mu3-castle", "08:30–17:30", "visit", "Neuschwanstein Castle", ["ari", "john", "ben"]),
    at("mu3-dinner", "19:30–21:00", "dinner", "Schneider Bräuhaus", ["ari", "ben"], "food"),
  ],
  mu4: [
    at("mu4-market", "11:00–12:30", "lunch", "Viktualienmarkt", ["ari", "john"], "food"),
    at("mu4-gap", "13:00–17:00", "open", "Afternoon", [], "gap"),
    at("mu4-evening", "18:00–20:00", "wander", "Glockenbachviertel", ["ari", "john", "ben"]),
  ],
  mu5: [
    at("mu5-train", "10:55–14:58", "ride", "ICE to Berlin", ["ari", "john", "ben"]),
    at("mu5-hotel", "16:00–16:30", "visit", "Hotel Oderberger", ["ari", "john", "ben"]),
    at("mu5-dinner", "19:00–21:00", "dinner", "Markthalle Neun", ["ari", "ben"], "food"),
  ],
  mu6: [
    at("mu6-wall", "10:00–12:00", "walk", "East Side Gallery", ["ari", "john"]),
    at("mu6-lunch", "12:30–13:30", "lunch", "Mustafa’s Gemüse Kebap", ["ari", "john", "ben"], "food"),
    at("mu6-island", "14:30–17:30", "visit", "Museum Island", ["ari", "ben"]),
  ],
  mu7: [
    at("mu7-flea", "11:00–13:30", "wander", "Mauerpark flea market", ["ari", "john", "ben"]),
    at("mu7-field", "15:00–18:00", "walk", "Tempelhofer Feld", ["john", "ben"]),
    at("mu7-dinner", "20:00–22:00", "dinner", "Prater Garten", ["ari", "john", "ben"], "food"),
  ],
  mu8: [
    at("mu8-dome", "10:00–11:30", "visit", "Reichstag dome", ["ari", "john", "ben"]),
    at("mu8-gap", "12:00–17:00", "open", "Afternoon", [], "gap"),
    at("mu8-dinner", "19:30–22:00", "dinner", "Nobelhart & Schmutzig", ["ari", "john"], "food"),
  ],
  mu9: [
    at("mu9-swim", "11:00–13:00", "visit", "Badeschiff", ["ari", "ben"]),
    at("mu9-art", "14:00–16:30", "visit", "Hamburger Bahnhof", ["ari", "john"]),
    at("mu9-bars", "21:00–00:30", "night", "Kreuzberg bars", ["ari", "john", "ben"]),
  ],
  mu10: [
    at("mu10-brunch", "10:00–11:00", "breakfast", "House of Small Wonder", ["ari", "john", "ben"], "food"),
    at("mu10-flight", "14:10–15:35", "ride", "Flight home", ["ari", "john", "ben"], "flight"),
  ],
  po1: [
    at("po1-flight", "07:30–09:05", "ride", "Flight to Porto", ["ari", "irene", "menta"], "flight"),
    at("po1-hotel", "10:00–10:30", "visit", "Torel Avantgarde", ["ari", "irene", "menta"]),
    at("po1-lunch", "12:30–13:45", "lunch", "Casa Guedes", ["ari", "menta"], "food"),
    at("po1-ribeira", "17:00–19:00", "walk", "Ribeira", ["ari", "irene"]),
    at("po1-dinner", "20:00–22:00", "dinner", "Taberna dos Mercadores", ["ari", "irene", "menta"], "food"),
  ],
  po2: [
    at("po2-lello", "10:00–11:00", "visit", "Livraria Lello", ["ari", "irene"]),
    at("po2-tower", "11:30–12:30", "visit", "Clérigos Tower", ["ari", "menta"]),
    at("po2-port", "15:00–17:00", "drinks", "Graham’s Port Lodge", ["ari", "irene", "menta"]),
    at("po2-sunset", "19:00–20:00", "sunset", "Jardim do Morro", ["ari", "irene", "menta"]),
  ],
  po3: [
    at("po3-douro", "09:00–18:00", "visit", "Douro Valley", ["ari", "irene", "menta"]),
    at("po3-dinner", "20:30–22:00", "dinner", "Cantinho do Avillez", ["ari", "menta"], "food"),
  ],
  po4: [
    at("po4-tram", "11:00–11:40", "ride", "Tram 1 to Foz", ["ari", "irene"]),
    at("po4-lunch", "12:00–13:30", "lunch", "Praia da Luz", ["ari", "irene", "menta"], "food"),
    at("po4-gap", "14:00–18:00", "open", "Afternoon", [], "gap"),
  ],
  po5: [
    at("po5-coffee", "09:30–10:30", "coffee", "Majestic Café", ["ari", "irene"]),
    at("po5-flight", "13:40–17:10", "ride", "Flight home", ["ari", "irene", "menta"], "flight"),
  ],
  pa1: [
    at("pa1-train", "07:16–10:35", "ride", "Eurostar to Paris", ["ari", "martina", "maria"]),
    at("pa1-hotel", "11:30–12:00", "visit", "Hotel des Grands Boulevards", ["ari", "martina", "maria"]),
    at("pa1-lunch", "13:00–14:30", "lunch", "Chez Janou", ["ari", "maria"], "food"),
    at("pa1-marais", "16:00–18:00", "wander", "Le Marais", ["ari", "martina"]),
    at("pa1-dinner", "20:00–21:30", "dinner", "Bouillon Chartier", ["ari", "martina", "maria"], "food"),
  ],
  pa2: [
    at("pa2-orsay", "09:30–12:30", "visit", "Musée d’Orsay", ["ari", "martina"]),
    at("pa2-lunch", "13:00–14:00", "lunch", "Café de Flore", ["ari", "martina", "maria"], "food"),
    at("pa2-garden", "15:00–17:00", "walk", "Jardin du Luxembourg", ["ari", "maria"]),
    at("pa2-seine", "20:30–22:00", "ride", "Seine by night", ["ari", "martina", "maria"]),
  ],
  pa3: [
    at("pa3-montmartre", "09:30–11:30", "wander", "Montmartre", ["ari", "martina"]),
    at("pa3-brunch", "12:00–13:30", "breakfast", "Holybelly", ["ari", "martina", "maria"], "food"),
    at("pa3-train", "17:13–20:30", "ride", "Eurostar home", ["ari", "martina", "maria"]),
  ],
}

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

const spent = (id: string, day: string, order: number, title: string, amount: number, split: number, paidBy: string): Expense => ({ id, day, order, title, amount, split, paidBy })

export const pastExpenses: Record<keyof typeof pastDays, Expense[]> = {
  amsterdam: [
    spent("am-e1", "Su, 9 Mar", 5, "Ziggo Dome tickets", 356, 4, "you"),
    spent("am-e2", "Su, 9 Mar", 4, "Foodhallen", 74, 3, "john"),
    spent("am-e3", "Sa, 8 Mar", 3, "Fenix Food Factory", 118, 3, "ben"),
    spent("am-e4", "Sa, 8 Mar", 2, "Markthal", 46, 2, "john"),
    spent("am-e5", "Sa, 8 Mar", 1, "Rotterdam train", 96, 4, "you"),
  ],
  munich: [
    spent("mu-e1", "We, 12 Aug", 8, "House of Small Wonder", 54, 3, "ben"),
    spent("mu-e2", "Mo, 10 Aug", 7, "Nobelhart & Schmutzig", 390, 2, "you"),
    spent("mu-e3", "Fr, 7 Aug", 6, "Hotel Oderberger", 684, 3, "john"),
    spent("mu-e4", "Fr, 7 Aug", 5, "ICE to Berlin", 267, 3, "you"),
    spent("mu-e5", "We, 5 Aug", 4, "Neuschwanstein tour", 177, 3, "ben"),
    spent("mu-e6", "Tu, 4 Aug", 3, "Hofbräuhaus", 88, 2, "john"),
    spent("mu-e7", "Mo, 3 Aug", 2, "Augustiner-Keller", 96, 3, "you"),
    spent("mu-e8", "Mo, 3 Aug", 1, "Louis Hotel", 812, 3, "john"),
  ],
  porto: [
    spent("po-e1", "Su, 20 Sep", 5, "Douro Valley tour", 270, 3, "you"),
    spent("po-e2", "Sa, 19 Sep", 4, "Graham’s tasting", 105, 3, "menta"),
    spent("po-e3", "Fr, 18 Sep", 3, "Taberna dos Mercadores", 128, 3, "irene"),
    spent("po-e4", "Fr, 18 Sep", 2, "Casa Guedes", 32, 2, "you"),
    spent("po-e5", "Fr, 18 Sep", 1, "Torel Avantgarde", 960, 3, "irene"),
  ],
  paris: [
    spent("pa-e1", "Sa, 26 Sep", 4, "Seine cruise", 66, 3, "maria"),
    spent("pa-e2", "Sa, 26 Sep", 3, "Café de Flore", 71, 3, "you"),
    spent("pa-e3", "Fr, 25 Sep", 2, "Bouillon Chartier", 84, 3, "martina"),
    spent("pa-e4", "Fr, 25 Sep", 1, "Hotel des Grands Boulevards", 540, 3, "you"),
  ],
}

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
  stampIds: string[]
  cities?: string[]
  savedList?: string
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
    stampIds: ["amsterdam", "rotterdam"],
  },
  {
    id: "munich",
    title: "Munich & Berlin",
    dates: "3 Aug – 12 Aug, 2026",
    when: "past",
    extra: 2,
    people: ["john", "ben"],
    stampIds: ["munich", "berlin"],
  },
  {
    id: "porto",
    title: "Porto weekend",
    dates: "18 Sep – 22 Sep, 2026",
    when: "past",
    extra: 1,
    people: ["irene", "menta"],
    stampIds: ["porto"],
  },
  {
    id: "paris",
    title: "Paris weekend",
    dates: "25 Sep – 27 Sep, 2026",
    when: "past",
    extra: 0,
    people: ["martina", "maria"],
    stampIds: ["paris"],
  },
  {
    id: "lisbon",
    title: "Exploring Lisbon",
    dates: "5 Oct – 8 Oct, 2026",
    when: "current",
    extra: 3,
    people: ["john", "ben"],
    stampIds: ["lisbon"],
    progress: "Day 2 of 4",
    left: "2 days left",
    next: { title: "Hotel Da Baixa", time: "22:30–08:00" },
  },
  {
    id: "tokyo",
    title: "Tokyo",
    dates: "11 Nov – 14 Nov, 2026",
    when: "upcoming",
    extra: 5,
    people: ["john", "ben", "irene"],
    stampIds: [],
  },
]

export const inviteLink = "https://trip.up/i/lisbon-hd"

export type Ticket = {
  id: string
  title: string
  mode: "flight" | "train"
  carrier: string
  from: { code: string; city: string; time: string }
  to: { code: string; city: string; time: string }
  date: string
  rows: [string, string][]
  code: string
}

export const tickets: Record<string, Ticket> = {
  pass: {
    id: "pass",
    title: "Boarding pass",
    mode: "flight",
    carrier: "TAP Air Portugal",
    from: { code: "AMS", city: "Amsterdam", time: "09:40" },
    to: { code: "LIS", city: "Lisbon", time: "11:35" },
    date: "5 Oct 2026",
    rows: [["Passenger", "Ari Mendoza"], ["Flight", "TU 834"], ["Seat", "14A"], ["Gate", "D12"], ["Boards", "09:10"], ["Class", "Economy"]],
    code: "M1MENDOZA/ARI TU834 AMSLIS 14A",
  },
  "tk-pass": {
    id: "tk-pass",
    title: "Boarding pass",
    mode: "flight",
    carrier: "KLM",
    from: { code: "AMS", city: "Amsterdam", time: "14:25" },
    to: { code: "HND", city: "Tokyo", time: "09:55" },
    date: "11 Nov 2026",
    rows: [["Passenger", "Ari Mendoza"], ["Flight", "KL 861"], ["Seat", "32K"], ["Gate", "F4"], ["Boards", "13:35"], ["Class", "Economy"]],
    code: "M1MENDOZA/ARI KL861 AMSHND 32K",
  },
  sintra: {
    id: "sintra",
    title: "Train ticket",
    mode: "train",
    carrier: "CP Comboios",
    from: { code: "ROS", city: "Lisboa Rossio", time: "09:11" },
    to: { code: "SNT", city: "Sintra", time: "09:51" },
    date: "7 Oct 2026",
    rows: [["Passengers", "Ari + 4"], ["Train", "CP 18207"], ["Car", "3"], ["Fare", "Return · 2nd"]],
    code: "CP18207-0710-ROSSNT-5PAX",
  },
  cascais: {
    id: "cascais",
    title: "Train ticket",
    mode: "train",
    carrier: "CP Comboios",
    from: { code: "CSD", city: "Cais do Sodré", time: "10:20" },
    to: { code: "CAS", city: "Cascais", time: "10:58" },
    date: "8 Oct 2026",
    rows: [["Passengers", "Ari + 4"], ["Train", "CP 19031"], ["Car", "2"], ["Fare", "Single · 2nd"]],
    code: "CP19031-0810-CSDCAS-5PAX",
  },
}

export const parsedTickets = ["sintra", "cascais"]

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

const cityPhoto = "/assets/passport/lisbon.jpg"
const shot = (name: string) => `/assets/trips/${name}.jpg`
const lisbonPhotos = [cityPhoto, shot("lisbon-tram"), "/assets/hotel-baixa.png", "/assets/food/elevada.jpg", "/assets/food/spiga.jpg", "/assets/food/ribatejo.jpg"]

export const passportStamps: Stamp[] = [
  { id: "amsterdam", city: "Amsterdam", country: "Netherlands", date: "Mar 2025", coord: [4.9041, 52.3676], tilt: 2.06, image: shot("amsterdam-1"), photos: [shot("amsterdam-1"), shot("amsterdam-2")] },
  { id: "rotterdam", city: "Rotterdam", country: "Netherlands", date: "Mar 2025", coord: [4.4777, 51.9244], tilt: 0, image: shot("rotterdam-1"), photos: [shot("rotterdam-1")] },
  { id: "munich", city: "Munich", country: "Germany", date: "Aug 2026", coord: [11.582, 48.1351], tilt: 5.43, image: shot("munich-1"), photos: [shot("munich-1"), shot("munich-2")] },
  { id: "berlin", city: "Berlin", country: "Germany", date: "Aug 2026", coord: [13.405, 52.52], tilt: -3.49, image: shot("berlin-1"), photos: [shot("berlin-1"), shot("berlin-2")] },
  { id: "porto", city: "Porto", country: "Portugal", date: "Sep 2026", coord: [-8.6291, 41.1579], tilt: -1.81, image: shot("porto-1"), photos: [shot("porto-1"), shot("porto-2")] },
  { id: "paris", city: "Paris", country: "France", date: "Sep 2026", coord: [2.3522, 48.8566], tilt: -6.65, image: shot("paris-1"), photos: [shot("paris-1"), shot("paris-2")] },
  { id: "lisbon", city: "Lisbon", country: "Portugal", date: "Oct 2026", coord: [-9.1393, 38.7223], tilt: 4.12, image: cityPhoto, photos: lisbonPhotos },
]

export const stampYear = (stamp: Stamp) => Number(stamp.date.slice(-4))
export const tripYear = (trip: Trip) => Number(trip.dates.slice(-4))
export const inYear = (value: number, year: number | "all") => year === "all" || value === year

export type SharedPhoto = {
  id: string
  src: string
  by: string
  day: DayId
  stampId: string | null
}

const shared = (id: string, src: string, by: string, day: DayId, stampId: string): SharedPhoto => ({ id, src, by, day, stampId })

export const sharedPhotos: SharedPhoto[] = [
  shared("lx-city", cityPhoto, "ari", "mon", "lisbon"),
  shared("lx-tram", shot("lisbon-tram"), "ben", "mon", "lisbon"),
  shared("lx-hotel", "/assets/hotel-baixa.png", "john", "tue", "lisbon"),
  shared("lx-elevada", "/assets/food/elevada.jpg", "irene", "tue", "lisbon"),
  shared("lx-spiga", "/assets/food/spiga.jpg", "menta", "wed", "lisbon"),
  shared("lx-ribatejo", "/assets/food/ribatejo.jpg", "ari", "wed", "lisbon"),
  shared("am-rotterdam", shot("rotterdam-1"), "john", "am1", "rotterdam"),
  shared("am-canal", shot("amsterdam-1"), "ben", "am2", "amsterdam"),
  shared("am-night", shot("amsterdam-2"), "irene", "am3", "amsterdam"),
  shared("mu-old", shot("munich-1"), "john", "mu2", "munich"),
  shared("mu-park", shot("munich-2"), "ben", "mu3", "munich"),
  shared("be-gate", shot("berlin-1"), "john", "mu6", "berlin"),
  shared("be-river", shot("berlin-2"), "ben", "mu8", "berlin"),
  shared("po-river", shot("porto-1"), "irene", "po1", "porto"),
  shared("po-tiles", shot("porto-2"), "menta", "po2", "porto"),
  shared("pa-street", shot("paris-1"), "martina", "pa1", "paris"),
  shared("pa-seine", shot("paris-2"), "maria", "pa2", "paris"),
]

export function photosForStamp(stamp: Stamp, sharedAlbum: SharedPhoto[]) {
  const extra = sharedAlbum
    .filter((item) => item.stampId === stamp.id && item.src !== stamp.image && !stamp.photos.includes(item.src))
    .map((item) => item.src)
  return [...new Set([...extra, ...stamp.photos])]
}

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

const drawn = (leg: RouteData["legs"][number]) => !leg.from.startsWith("flight") && !leg.to.endsWith("night")
const nowDay = route.stops.hotel.day
const todayLegs = route.legs.filter((leg) => leg.day === nowDay && drawn(leg))
const nowLeg = todayLegs.findIndex((leg) => leg.from === "hotel")

export const currentPoint: LngLat = onPath("hotel")
export const pastRoute = join(todayLegs.slice(0, nowLeg))
const firstFuture = route.legs.findIndex((leg) => leg.from === "hotel" && leg.day === nowDay)
export const futureRoute = join(route.legs.slice(firstFuture).filter((leg) => !leg.from.startsWith("flight")))


const key = ([lng, lat]: LngLat) => `${lng},${lat}`
export function dayRoute(day: DayId): { coords: LngLat[]; future: boolean }[] {
  return route.legs
    .map((leg, index) => ({ leg, future: index >= firstFuture }))
    .filter(({ leg }) => leg.day === day && drawn(leg))
    .map(({ leg, future }) => ({ coords: leg.coords, future }))
}

export const mapStops: { id: string; day: DayId; coord: LngLat; past: boolean }[] = route.order
  .map((id, index) => ({ id, day: route.stops[id].day, coord: onPath(id), past: index < nowIndex }))
  .filter((item) => !item.id.startsWith("flight") && !item.id.endsWith("night") && key(item.coord) !== key(currentPoint))

export const futureStops: { id: string; coord: LngLat; day: DayId }[] = route.order
  .slice(nowIndex + 1)
  .filter((id) => !id.endsWith("night"))
  .map((id) => ({ id, coord: onPath(id), day: route.stops[id].day }))
  .filter((stop) => key(stop.coord) !== key(currentPoint))

export function dayFocus(day: DayId) {
  const ids = route.order.filter((id) => route.stops[id].day === day)
  const local = ids.filter((id) => !id.startsWith("flight"))
  const focus = local.length ? local : ids
  const legs = route.legs.filter((leg) => leg.day === day && drawn(leg))
  return {
    firstId: focus[0],
    first: onPath(focus[0]),
    coords: [...focus.map((id) => onPath(id)), ...legs.flatMap((leg) => leg.coords)],
  }
}

type AwayDay = { day: DayId; path: LngLat[]; stops: LngLat[] }
const home = (coord: LngLat) => ({ home: coord })
type Leg = LngLat | { home: LngLat }
const plan = (day: DayId, ...points: Leg[]): AwayDay => ({
  day,
  path: points.map((point) => ("home" in point ? point.home : point)),
  stops: points.filter((point): point is LngLat => !("home" in point)),
})

const ams = { flat: [4.8897, 52.37] as LngLat, centraal: [4.9003, 52.3789] as LngLat }
const mu = { louis: [11.5763, 48.1352] as LngLat, oder: [13.4078, 52.5392] as LngLat }
const po = { torel: [-8.6153, 41.1447] as LngLat, airport: [-8.6781, 41.2481] as LngLat }
const pa = { hotel: [2.344, 48.871] as LngLat, nord: [2.3553, 48.8809] as LngLat }
const tk = { hotel: [139.702, 35.6951] as LngLat, haneda: [139.7798, 35.5494] as LngLat }

export const awayStops: Record<Exclude<TripId, "lisbon">, AwayDay[]> = {
  amsterdam: [
    plan("am1", home(ams.flat), [4.8866, 52.3625], ams.centraal, [4.4863, 51.92], [4.4826, 51.9093], [4.4908, 51.8989]),
    plan("am2", home(ams.flat), [4.8852, 52.36], [4.868, 52.3669], [4.9375, 52.3134]),
    plan("am3", home(ams.flat), [4.8847, 52.37], [4.8686, 52.358], ams.centraal),
  ],
  munich: [
    plan("mu1", [11.7861, 48.3538], mu.louis, [11.5755, 48.1374], [11.5486, 48.1437]),
    plan("mu2", home(mu.louis), [11.5833, 48.1299], [11.592, 48.159], [11.5797, 48.1376]),
    plan("mu3", home(mu.louis), [10.7498, 47.5576], [11.5768, 48.137]),
    plan("mu4", home(mu.louis), [11.5763, 48.1348], [11.569, 48.13]),
    plan("mu5", home(mu.louis), [11.558, 48.1402], mu.oder, [13.4318, 52.5021]),
    plan("mu6", home(mu.oder), [13.4396, 52.505], [13.3884, 52.489], [13.3984, 52.5169]),
    plan("mu7", home(mu.oder), [13.4025, 52.5433], [13.404, 52.473], [13.41, 52.5397]),
    plan("mu8", home(mu.oder), [13.3761, 52.5186], [13.3924, 52.5049]),
    plan("mu9", home(mu.oder), [13.4518, 52.4974], [13.3721, 52.5284], [13.419, 52.499]),
    plan("mu10", home(mu.oder), [13.3886, 52.5244], [13.5033, 52.3667]),
  ],
  porto: [
    plan("po1", po.airport, po.torel, [-8.606, 41.1466], [-8.6133, 41.1408], [-8.6138, 41.1417]),
    plan("po2", home(po.torel), [-8.6148, 41.1469], [-8.6146, 41.1457], [-8.613, 41.133], [-8.609, 41.1375]),
    plan("po3", home(po.torel), [-7.546, 41.19], [-8.613, 41.144]),
    plan("po4", home(po.torel), [-8.615, 41.1405], [-8.677, 41.156]),
    plan("po5", home(po.torel), [-8.6065, 41.147], po.airport),
  ],
  paris: [
    plan("pa1", pa.nord, pa.hotel, [2.3662, 48.8563], [2.359, 48.858], [2.3448, 48.872]),
    plan("pa2", home(pa.hotel), [2.3266, 48.86], [2.3325, 48.854], [2.3372, 48.8462], [2.3412, 48.8575]),
    plan("pa3", home(pa.hotel), [2.3431, 48.8867], [2.362, 48.8716], pa.nord),
  ],
  tokyo: [
    plan("tk1", tk.haneda, tk.hotel, [139.6983, 35.6866]),
    plan("tk2", home(tk.hotel), [139.6993, 35.6764], [139.7005, 35.6595]),
    plan("tk3", home(tk.hotel), [139.7707, 35.6655], [139.7838, 35.6491]),
    plan("tk4", home(tk.hotel), tk.haneda),
  ],
}

const streets = awayRoutes as unknown as Record<DayId, LngLat[]>
export const awayPlans = Object.fromEntries(
  Object.entries(awayStops).map(([trip, plans]) => [trip, plans.map((item) => ({ ...item, path: streets[item.day] ?? item.path }))]),
) as typeof awayStops

function arc([x1, y1]: LngLat, [x2, y2]: LngLat): LngLat[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const bend = 0.22
  const cx = (x1 + x2) / 2 - dy * bend
  const cy = (y1 + y2) / 2 + dx * bend
  return Array.from({ length: 161 }, (_, index) => {
    const t = index / 160
    const u = 1 - t
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2] as LngLat
  })
}

export const passportArcs: LngLat[][] = passportStamps.slice(1).map((stamp, index) => arc(passportStamps[index].coord, stamp.coord))
