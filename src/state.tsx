import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react"
import {
  days,
  expenseSummary,
  friends,
  initialExpenses,
  initialMembers,
  people,
  savedPlaces,
  stops,
  pastDays,
  sharedPhotos,
  tokyoDays,
  tripDays,
  tuesdayPoll,
  type DayId,
  type Expense,
  type Poll,
  type PollOption,
  type SharedPhoto,
  type Trip,
  type TripId,
} from "./data"
import { daylight, type Palette } from "./mapStyle"

type Tab = "trips" | "friends" | "passport"
type Mode = "map" | "list"
type Filter = "all" | "past" | "upcoming"
type Sheet = "trip" | "group" | "balances"
type TripTab = "itinerary" | "expenses" | "docs" | "photos"
type Overlay =
  | null
  | "invite"
  | "bill"
  | "poll"
  | "ticket"
  | "reservation"
  | "search"
  | "style"
  | "edit"
  | "new-trip"

export const PEEK = 0.36
export const MID = 0.56
export const OPEN = 630 / 874
export const TALL = 796 / 874

type State = {
  tab: Tab
  mode: Mode
  filter: Filter
  snap: number
  year: number | "all"
  sheet: Sheet
  tripTab: TripTab
  day: DayId
  overlay: Overlay
  splitOpen: boolean
  members: string[]
  selectedFriends: string[]
  friendQuery: string
  pollByDay: Partial<Record<DayId, Poll>>
  pollAnchor: string | null
  gapDays: DayId[]
  expenses: Expense[]
  summary: typeof expenseSummary
  toast: string | null
  palette: Palette
  tripTitle: string
  search: string
  billAmount: string
  billPlace: string
  billDate: string
  billPayer: string
  splitIds: string[]
  locateTick: number
  launched: boolean
  toastTone: "info" | "error"
  pollVoting: boolean
  tripStart: string
  tripEnd: string
  savedList: string
  stamp: string | null
  gallery: boolean
  stampCovers: Record<string, string>
  photos: SharedPhoto[]
  openPhoto: string | null
  focusStop: { id: string; coord: [number, number] } | null
  ticket: string
  pollLive: DayId | null
  trip: TripId
  tripBack: Mode
  createdTrips: Trip[]
  removedStops: string[]
  removedTrips: string[]
}

const initial: State = {
  tab: "trips",
  mode: "map",
  filter: "all",
  snap: PEEK,
  sheet: "trip",
  overlay: null,
  tripTab: "itinerary",
  day: "tue",
  splitOpen: false,
  members: initialMembers,
  selectedFriends: [],
  friendQuery: "",
  pollByDay: { tue: tuesdayPoll },
  pollAnchor: null,
  gapDays: ["wed"],
  expenses: initialExpenses,
  summary: expenseSummary,
  toast: null,
  palette: daylight,
  tripTitle: "Exploring Lisbon",
  search: "",
  billAmount: "148",
  billPlace: "Pizzeria La Spiga",
  billDate: "07/10/26",
  billPayer: "ari",
  splitIds: ["john", "ben", "irene", "menta"],
  locateTick: 0,
  year: "all",
  launched: false,
  toastTone: "info",
  pollVoting: true,
  tripStart: "2026-10-05",
  tripEnd: "2026-10-08",
  savedList: "",
  stamp: null,
  gallery: false,
  stampCovers: {},
  photos: sharedPhotos,
  openPhoto: null,
  focusStop: null,
  ticket: "pass",
  pollLive: null,
  trip: "lisbon",
  tripBack: "map",
  createdTrips: [],
  removedStops: [],
  removedTrips: [],
}

type Action =
  | { type: "tab"; tab: Tab }
  | { type: "mode"; mode: Mode }
  | { type: "filter"; filter: Filter }
  | { type: "snap"; snap: number }
  | { type: "year"; year: number | "all" }
  | { type: "open-trip"; trip?: TripId }
  | { type: "back" }
  | { type: "sheet"; sheet: Sheet }
  | { type: "trip-tab"; tab: TripTab }
  | { type: "day"; day: DayId }
  | { type: "focus-stop"; id: string; coord: [number, number] }
  | { type: "overlay"; overlay: Overlay; anchor?: string | null; voting?: boolean }
  | { type: "launch"; target: "trip" | "map" }
  | { type: "home" }
  | { type: "split"; open: boolean }
  | { type: "toggle-friend"; id: string }
  | { type: "friend-query"; query: string }
  | { type: "add-members" }
  | { type: "remove-member"; id: string }
  | { type: "vote"; optionId: string }
  | { type: "save-poll"; poll: Poll }
  | { type: "palette"; palette: Palette }
  | { type: "edit-trip"; title: string; start: string; end: string; members: string[]; savedList: string }
  | { type: "stamp"; id: string | null }
  | { type: "gallery"; open: boolean }
  | { type: "stamp-cover"; id: string; src: string }
  | { type: "add-photo"; photo: SharedPhoto }  | { type: "sim-vote" }
  | { type: "search"; search: string }
  | { type: "bill"; patch: Partial<Pick<State, "billAmount" | "billPlace" | "billDate" | "billPayer">> }
  | { type: "toggle-split"; id: string }
  | { type: "save-bill" }
  | { type: "toast"; toast: string | null; tone?: "info" | "error" }
  | { type: "locate" }
  | { type: "create-trip"; trip: Trip }
  | { type: "remove-stop"; id: string; name: string }
  | { type: "remove-trip"; id: string; title: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tab":
      return {
        ...state,
        tab: action.tab,
        overlay: null,
        splitOpen: false,
        stamp: null,
        gallery: false,
        mode: action.tab === "trips" ? state.mode : "map",
        snap: action.tab === "trips" ? PEEK : OPEN,
      }
    case "mode":
      return { ...state, mode: action.mode, tab: "trips", overlay: null }
    case "filter":
      return { ...state, filter: action.filter }
    case "snap":
      return { ...state, snap: action.snap }
    case "year":
      return {
        ...state,
        year: action.year,
        toast: action.year === 2027 ? "No trips in 2027." : null,
        toastTone: "info",
      }
    case "open-trip": {
      const trip = action.trip ?? "lisbon"
      const drawerOpen = state.tab === "trips" && state.mode === "map" && state.snap !== PEEK
      return {
        ...state,
        trip,
        day: trip === state.trip ? state.day : trip === "lisbon" ? TODAY : tripDays(trip)[0].id,
        tripBack: state.tab === "trips" ? state.mode : "map",
        openPhoto: null,
        focusStop: null,
        stamp: null,
        gallery: false,
        tab: "trips",
        mode: "map",
        snap: drawerOpen ? state.snap : OPEN,
        sheet: "trip",
        overlay: null,
        tripTab: "itinerary",
      }
    }
    case "back":
      if (state.gallery) return { ...state, gallery: false }
      if (state.stamp) return { ...state, stamp: null }
      if (state.splitOpen) return { ...state, splitOpen: false }
      if (state.overlay) return { ...state, overlay: null, splitOpen: false }
      if (state.sheet === "balances") return { ...state, sheet: "trip", tripTab: "expenses" }
      if (state.sheet !== "trip") return { ...state, sheet: "trip" }
      return { ...state, snap: PEEK, mode: state.tripBack, tripBack: "map", trip: "lisbon", day: state.trip === "lisbon" ? state.day : TODAY }
    case "sheet":
      return { ...state, sheet: action.sheet, snap: OPEN }
    case "trip-tab":
      return { ...state, tripTab: action.tab, sheet: "trip", snap: OPEN }
    case "day":
      return { ...state, day: action.day, focusStop: null }
    case "focus-stop":
      return { ...state, focusStop: { id: action.id, coord: [action.coord[0], action.coord[1]] } }
    case "overlay":
      return {
        ...state,
        overlay: action.overlay,
        pollAnchor: action.overlay === "poll" ? (action.anchor ?? null) : state.pollAnchor,
        pollVoting: action.overlay === "poll" ? (action.voting ?? true) : state.pollVoting,
        ticket: action.overlay === "ticket" ? (action.anchor ?? "pass") : state.ticket,
        splitOpen: false,
        selectedFriends:
          action.overlay === "invite" ? [] : state.selectedFriends,
        friendQuery: action.overlay === "invite" ? "" : state.friendQuery,
      }
    case "split":
      return { ...state, splitOpen: action.open }
    case "toggle-friend": {
      const has = state.selectedFriends.includes(action.id)
      return {
        ...state,
        selectedFriends: has
          ? state.selectedFriends.filter((id) => id !== action.id)
          : [...state.selectedFriends, action.id],
      }
    }
    case "friend-query":
      return { ...state, friendQuery: action.query }
    case "add-members": {
      const incoming = state.selectedFriends.filter((id) => !state.members.includes(id))
      if (incoming.length === 0) {
        return { ...state, toast: "Pick someone to add first", toastTone: "error" }
      }
      return {
        ...state,
        members: [...state.members, ...incoming],
        selectedFriends: [],
        overlay: null,
        sheet: "group",
        snap: OPEN,
        toastTone: "info",
        toast:
          incoming.length === 1
            ? `${people[incoming[0]]?.name.split(" ")[0] ?? "Friend"} has been added.`
            : `${incoming.length} members have been added.`,
      }
    }
    case "remove-member":
      return { ...state, members: state.members.filter((id) => id !== action.id) }
    case "vote": {
      const poll = state.pollByDay[state.day]
      if (!poll) return state
      const mine = "ari"
      const options: PollOption[] = poll.options.map((option) => {
        const voted = option.votes.includes(mine)
        if (option.id !== action.optionId) {
          if (!poll.multiple && voted) return { ...option, votes: option.votes.filter((id) => id !== mine) }
          return option
        }
        if (voted && poll.revoting) return { ...option, votes: option.votes.filter((id) => id !== mine) }
        if (voted) return option
        return { ...option, votes: [...option.votes, mine] }
      })
      return {
        ...state,
        pollLive: state.day,
        pollByDay: { ...state.pollByDay, [state.day]: { ...poll, revealed: true, options } },
      }
    }
    case "sim-vote": {
      const day = state.pollLive
      const poll = day ? state.pollByDay[day] : undefined
      if (!day || !poll || poll.decided || poll.options.length === 0) return { ...state, pollLive: null }
      const voted = new Set(poll.options.flatMap((option) => option.votes))
      const waiting = state.members.filter((id) => !voted.has(id))
      if (waiting.length === 0) return { ...state, pollLive: null }
      const voter = waiting[0]
      const lead = poll.options.reduce((best, option) => (option.votes.length > best.votes.length ? option : best), poll.options[0])
      const pick = voted.size % 3 === 1 ? poll.options[(poll.options.indexOf(lead) + 1) % poll.options.length] : lead
      const options = poll.options.map((option) => (option.id === pick.id ? { ...option, votes: [...option.votes, voter] } : option))
      const done = waiting.length === 1
      const winner = options.reduce((best, option) => (option.votes.length > best.votes.length ? option : best), options[0])
      const name = savedPlaces.find((item) => item.id === winner.id)?.name ?? winner.name ?? "The winner"
      return {
        ...state,
        pollLive: done ? null : day,
        pollByDay: { ...state.pollByDay, [day]: { ...poll, options, decided: done } },
        ...(done ? { toast: `${name} won the vote.`, toastTone: "info" as const } : {}),
      }
    }
    case "save-poll": {
      const previous = state.pollByDay[state.day]
      const anchor = state.pollAnchor ?? previous?.anchorStopId
      const merged: Poll = {
        ...action.poll,
        anchorStopId: anchor,
        revealed: false,
        decided: action.poll.decided ?? !state.pollVoting,
        options: action.poll.options.map((option) => {
          const prior = previous?.options.find((item) => item.id === option.id)
          return { ...option, votes: prior?.votes ?? [] }
        }),
      }
      return {
        ...state,
        pollByDay: { ...state.pollByDay, [state.day]: merged },
        pollAnchor: null,
        gapDays: state.gapDays.filter((day) => day !== state.day),
        overlay: null,
        snap: OPEN,
        sheet: "trip",
        tripTab: "itinerary",
        toastTone: "info",
        toast: state.pollVoting ? "New poll added." : "Added to itinerary.",
      }
    }
    case "palette":
      return { ...state, palette: action.palette }
    case "edit-trip":
      if (action.end < action.start) return { ...state, toast: "End date is before the start", toastTone: "error" }
      return {
        ...state,
        tripTitle: action.title.trim() || state.tripTitle,
        tripStart: action.start,
        tripEnd: action.end,
        members: action.members,
        savedList: action.savedList,
        overlay: null,
        toastTone: "info",
        toast: "Trip updated.",
      }
    case "stamp":
      return { ...state, stamp: action.id, gallery: false }
    case "gallery":
      return { ...state, gallery: action.open }
    case "stamp-cover":
      return { ...state, stampCovers: { ...state.stampCovers, [action.id]: action.src }, toast: "Stamp photo updated.", toastTone: "info" }
    case "add-photo":
      return { ...state, photos: [action.photo, ...state.photos], toast: "Photo shared with the group.", toastTone: "info" }
    case "search":
      return { ...state, search: action.search }
    case "bill":
      return { ...state, ...action.patch }
    case "toggle-split": {
      const has = state.splitIds.includes(action.id)
      return {
        ...state,
        splitIds: has ? state.splitIds.filter((id) => id !== action.id) : [...state.splitIds, action.id],
      }
    }
    case "save-bill": {
      const amount = Number(state.billAmount.replace(",", "."))
      const expense: Expense = {
        id: `e-${Date.now()}`,
        day: "Tu, 6 Oct",
        order: 100 + state.expenses.length,
        title: state.billPlace,
        amount: Number.isFinite(amount) ? amount : 0,
        split: state.splitIds.length + 1,
        paidBy: state.billPayer === "ari" ? "you" : state.billPayer,
      }
      return {
        ...state,
        expenses: [expense, ...state.expenses],
        overlay: null,
        splitOpen: false,
        snap: OPEN,
        sheet: "trip",
        tripTab: "expenses",
        toastTone: "info",
        toast: "New expense added.",
      }
    }
    case "toast":
      return { ...state, toast: action.toast, toastTone: action.tone ?? "info" }
    case "remove-stop":
      return {
        ...state,
        removedStops: [...state.removedStops, action.id],
        focusStop: state.focusStop?.id === action.id ? null : state.focusStop,
        toastTone: "info",
        toast: `${action.name} removed.`,
      }
    case "remove-trip":
      return {
        ...state,
        removedTrips: [...state.removedTrips, action.id],
        createdTrips: state.createdTrips.filter((trip) => trip.id !== action.id),
        toastTone: "info",
        toast: `${action.title} deleted.`,
      }
    case "launch": {
      const base = {
        ...state,
        openPhoto: null,
        launched: true,
        trip: "lisbon" as const,
        tab: "trips" as const,
        mode: "map" as const,
        overlay: null,
        stamp: null,
        gallery: false,
      }
      if (action.target === "map") return { ...base, snap: PEEK, sheet: "trip" as const, tripTab: "itinerary" as const }
      return { ...base, snap: OPEN, sheet: "trip" as const, tripTab: "itinerary" as const, day: "tue" }
    }
    case "home":
      return { ...state, launched: false, overlay: null, splitOpen: false, sheet: "trip", toast: null }
    case "create-trip":
      return {
        ...state,
        createdTrips: [...state.createdTrips, action.trip],
        overlay: null,
        tab: "trips",
        mode: "list",
        filter: "all",
        snap: PEEK,
        toastTone: "info",
        toast: action.trip.people.length > 0 ? `${action.trip.title} created. Invites sent.` : `${action.trip.title} created.`,
      }
    case "locate":
      return { ...state, locateTick: state.locateTick + 1 }
    default:
      return state
  }
}

type Store = {
  state: State
  dispatch: Dispatch<Action>
  screen: HTMLElement | null
  setScreen: (node: HTMLElement | null) => void
}

const Ctx = createContext<Store | null>(null)

export function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [screen, setScreen] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!state.toast) return
    const id = window.setTimeout(() => dispatch({ type: "toast", toast: null }), 2200)
    return () => window.clearTimeout(id)
  }, [state.toast])

  useEffect(() => {
    if (!state.pollLive) return
    const id = window.setTimeout(() => dispatch({ type: "sim-vote" }), 1300)
    return () => window.clearTimeout(id)
  }, [state.pollLive, state.pollByDay])

  const value = useMemo(() => ({ state, dispatch, screen, setScreen }), [state, screen])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const store = useContext(Ctx)
  if (!store) throw new Error("Store missing")
  return store
}

export function person(id: string) {
  return people[id]
}

export function place(id: string) {
  return savedPlaces.find((item) => item.id === id)
}

export function dayStops(day: DayId) {
  return stops[day] ?? []
}

export const TODAY: DayId = "tue" as DayId

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function shortDate(iso: string) {
  const [, month, day] = iso.split("-").map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

export function tripRange(start: string, end: string) {
  return `${shortDate(start)} – ${shortDate(end)}, ${end.slice(0, 4)}`
}

const pastDayIds = new Set(Object.values(pastDays).flatMap((list) => list.map((item) => item.id)))

export function isPastDay(day: DayId) {
  if (pastDayIds.has(day)) return true
  const index = days.findIndex((item) => item.id === day)
  return index >= 0 && index < days.findIndex((item) => item.id === TODAY)
}

export function dayMeta(day: DayId) {
  return [...days, ...tokyoDays, ...Object.values(pastDays).flat()].find((item) => item.id === day) ?? days[1]
}

export { friends }
