import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import { isPastTrip, parsedTickets, passportStamps, pastExpenses, tickets, trips, tripDays, type DayId, type Expense, type Poll, type SharedPhoto, type Stop } from "../data"
import { PEEK, TALL, TODAY, dayStops, isPastDay, person, place, tripRange, useStore } from "../state"
import { FriendsPanel } from "./screens"
import { PassportPanel } from "./Passport"
import { AvatarStack, DaySegments, Face, PersonName, PhotoStack, SwipeRow, ToolAction, ToolIcon, Toolbar } from "./chrome"
import { ActivityIcon, IconChevron, IconLocate, IconPencil, IconTrash } from "./icons"
import { mapPaths, stopKey } from "../mapPaths"

export function TripDrawer() {
  const { state } = useStore()
  if (state.tab === "friends")
    return (
      <SheetFrame hug view="friends">
        <FriendsPanel />
      </SheetFrame>
    )
  if (state.tab === "passport")
    return (
      <SheetFrame hug view="passport">
        <PassportPanel />
      </SheetFrame>
    )
  if (state.snap === PEEK) return <PeekCard />
  const photos = state.trip === "lisbon" && <PhotoShortcut hidden={state.snap === TALL} />
  if (state.sheet === "group")
    return (
      <SheetFrame hug view="group" above={photos}>
        <GroupSheet />
      </SheetFrame>
    )
  return (
    <SheetFrame hug={state.tripTab === "docs"} view={`trip-${state.tripTab}`} above={photos}>
      <TripSheet />
    </SheetFrame>
  )
}

function SheetFrame({ hug = false, view, above, children }: { hug?: boolean; view: string; above?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const frame = ref.current
    const parent = frame?.parentElement
    const content = frame?.firstElementChild as HTMLElement | null
    if (!frame || !parent || !content) return
    const measure = () => {
      const full = parent.clientHeight - 8
      setHeight(hug ? Math.min(content.offsetHeight, full) : full)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    observer.observe(content)
    return () => observer.disconnect()
  }, [hug, view])
  return (
    <>
      {above && height !== undefined && (
        <div className="sheet-above" style={{ bottom: height + 8 }} data-vaul-no-drag>
          {above}
        </div>
      )}
      <div ref={ref} className={hug ? "sheet-frame hug" : "sheet-frame"} style={{ height }}>
        {children}
      </div>
    </>
  )
}

function PeekCard() {
  const { dispatch } = useStore()
  return (
    <div className="peek-wrap">
      <div className="peek-tools">
        <PhotoShortcut />
        <button type="button" className="locate peek-locate glass" aria-label="Locate" onClick={() => dispatch({ type: "locate" })}>
          <IconLocate />
        </button>
      </div>
      <CurrentTripCard />
    </div>
  )
}

const cameraRoll = [
  "/assets/food/elevada.jpg",
  "/assets/trips/lisbon-tram.jpg",
  "/assets/food/spiga.jpg",
  "/assets/passport/lisbon.jpg",
  "/assets/food/ribatejo.jpg",
]

function PhotoShortcut({ hidden = false }: { hidden?: boolean }) {
  const { dispatch } = useStore()
  const [tray, setTray] = useState<"closed" | "open" | "closing">("closed")
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const open = tray === "open"
  const close = () => setTray((current) => (current === "open" ? "closing" : current))

  useEffect(() => {
    if (!open) return
    const outside = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close()
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])

  function share(src: string) {
    const id = `up-${Date.now()}`
    dispatch({ type: "add-photo", photo: { id, src, by: "ari", day: TODAY, stampId: "lisbon" } })
    close()
  }

  if (hidden && open) setTray("closing")

  return (
    <div className={hidden ? "peek-photos away" : "peek-photos"} ref={root} aria-hidden={hidden || undefined}>
      {tray !== "closed" && (
        <div
          className={tray === "closing" ? "peek-photo-tray closing" : "peek-photo-tray"}
          role="menu"
          aria-label="Recent photos"
          style={{ "--n": cameraRoll.length + 1 } as CSSProperties}
          onAnimationEnd={(event) => {
            if (tray === "closing" && event.target === event.currentTarget.firstElementChild) setTray("closed")
          }}
        >
          {cameraRoll.map((src, index) => (
            <button key={src} type="button" role="menuitem" aria-label="Share this photo" tabIndex={open ? 0 : -1} style={{ "--i": index } as CSSProperties} onClick={() => share(src)}>
              <img src={src} alt="" draggable={false} />
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="peek-photo-all"
            aria-label="All photos"
            tabIndex={open ? 0 : -1}
            style={{ "--i": cameraRoll.length } as CSSProperties}
            onClick={() => {
              close()
              input.current?.click()
            }}
          >
            <img className="asset" src="/assets/icons/image.svg" alt="" />
            All
          </button>
        </div>
      )}
      <button
        type="button"
        className="glass-icon glass peek-photos-btn"
        aria-label="Share a photo"
        aria-expanded={open}
        onClick={() => (open ? close() : setTray("open"))}
      >
        <img className="asset" src="/assets/icons/photo-shortcut.svg" alt="" draggable={false} />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          if (!file.type.startsWith("image/")) {
            dispatch({ type: "toast", toast: "Choose a photo to share.", tone: "error" })
            return
          }
          const reader = new FileReader()
          reader.onload = () => typeof reader.result === "string" && share(reader.result)
          reader.readAsDataURL(file)
        }}
      />
    </div>
  )
}

export function CurrentTripCard() {
  const { state, dispatch } = useStore()
  return (
    <button type="button" className="peek-card" onClick={() => dispatch({ type: "open-trip" })}>
      <div className="itinerary-intro">
        <header className="trip-head">
          <h1>{state.tripTitle}</h1>
          <span className="head-avatars">
            <PhotoStack kind="header" ids={state.members} extra={1} />
          </span>
        </header>
        <p className="trip-dates">
          <img className="asset" src="/assets/icons/calendar.svg" alt="" /> {tripRange(state.tripStart, state.tripEnd)}
        </p>
      </div>
      <hr className="peek-rule" />
      <div className="peek-progress">
        <div className="peek-progress-labels">
          <span>Day 2 of 4</span>
          <span>2 days left</span>
        </div>
        <DaySegments fills={tripDays("lisbon").map((item) => item.progress)} />
      </div>
      <div className="up-next">
        <small>Up next</small>
        <div>
          <img className="hotel-thumb" src="/assets/hotel-baixa.png" alt="" />
          <span>
            <strong>Hotel Da Baixa</strong>
            <em>22.30–08.00</em>
          </span>
          <IconChevron />
        </div>
      </div>
    </button>
  )
}

type Doc = { id: string; title: string; detail: string; kind: "link" | "file" | "ticket"; overlay?: "reservation" | "ticket"; ticket?: string }

const baseDocs: Doc[] = [
  { id: "hotel", title: "Hotel Da Baixa", detail: "Reservation · confirmation HD-2048", kind: "link", overlay: "reservation" },
  { id: "pass", title: "Boarding pass", detail: "AMS → LIS · 5 Oct 2026", kind: "ticket", overlay: "ticket", ticket: "pass" },
]

const tokyoDocs: Doc[] = [
  { id: "tk-hotel", title: "Hotel Gracery Shinjuku", detail: "Reservation · confirmation GS-7731", kind: "link" },
  { id: "tk-pass", title: "Boarding pass", detail: "AMS → HND · 11 Nov 2026", kind: "ticket", overlay: "ticket", ticket: "tk-pass" },
]

const pastDocs: Record<string, Doc[]> = {
  amsterdam: [
    { id: "am-concert", title: "Ziggo Dome tickets", detail: "Concert · 9 Mar 2025 · 4 tickets", kind: "ticket" },
    { id: "am-train", title: "Rotterdam day return", detail: "NS train · 8 Mar 2025", kind: "ticket" },
  ],
  munich: [
    { id: "mu-flight", title: "Boarding pass", detail: "AMS → MUC · 3 Aug 2026", kind: "ticket" },
    { id: "mu-hotel", title: "Louis Hotel", detail: "Reservation · confirmation LH-5512", kind: "link" },
    { id: "mu-train", title: "ICE to Berlin", detail: "MUC → BER · 7 Aug 2026", kind: "ticket" },
    { id: "mu-home", title: "Boarding pass", detail: "BER → AMS · 12 Aug 2026", kind: "ticket" },
  ],
  porto: [
    { id: "po-flight", title: "Boarding pass", detail: "AMS → OPO · 18 Sep 2026", kind: "ticket" },
    { id: "po-hotel", title: "Torel Avantgarde", detail: "Reservation · confirmation TA-3190", kind: "link" },
    { id: "po-douro", title: "Douro Valley tour", detail: "Booking · 20 Sep 2026 · 3 guests", kind: "file" },
  ],
  paris: [
    { id: "pa-train", title: "Eurostar", detail: "AMS → PAR · 25 Sep 2026", kind: "ticket" },
    { id: "pa-hotel", title: "Hotel des Grands Boulevards", detail: "Reservation · confirmation GB-8824", kind: "link" },
  ],
}

function useTripHead() {
  const { state } = useStore()
  const trip = trips.find((item) => item.id === state.trip)
  return state.trip !== "lisbon" && trip
    ? { title: trip.title, dates: trip.dates, members: trip.people, extra: trip.extra + 2 - trip.people.length }
    : { title: state.tripTitle, dates: tripRange(state.tripStart, state.tripEnd), members: state.members, extra: 1 }
}

function TripSheet() {
  const { state } = useStore()
  return <TripSheetBody key={state.trip} />
}

function TripSheetBody() {
  const { state, dispatch } = useStore()
  const head = useTripHead()
  const future = state.trip === "tokyo"
  const done = isPastTrip(state.trip)
  const [docs, setDocs] = useState(future ? tokyoDocs : (pastDocs[state.trip] ?? baseDocs))
  const [openPhoto, setOpenPhoto] = useState<string | null>(state.openPhoto)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const poll = state.pollByDay[state.day]
  const tab = state.tripTab
  const plans = useMemo(() => dayStops(state.day).filter((stop) => !state.removedStops.includes(stopKey(state.day, stop.id))), [state.day, state.removedStops])
  const plansRef = useRef<HTMLDivElement>(null)
  const pastDay = isPastDay(state.day)
  const focus = state.focusStop
  const focused = useRef<typeof focus>(null)
  useLayoutEffect(() => {
    const scroller = plansRef.current
    if (!scroller) return
    const card = tab === "itinerary" && focus ? findCard(scroller, focus.id, plans) : null
    if (card) {
      const goal = () => centered(scroller, card)
      if (focused.current === focus) {
        scroller.scrollTop = goal()
        return
      }
      focused.current = focus
      const stop = glide(scroller, goal, card)
      return () => {
        if (stop()) focused.current = null
      }
    }
    const current =
      tab === "itinerary"
        ? (scroller.querySelector<HTMLElement>(".card.poll.pending") ??
          (state.day === "tue" ? scroller.querySelector<HTMLElement>(".card.now") : null))
        : null
    if (!current) {
      scroller.scrollTop = 0
      return
    }
    const top = current.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const previous = current.previousElementSibling as HTMLElement | null
    const peek = current.matches(".pending") ? 20 : previous ? previous.offsetHeight * 0.75 + 44 : 0
    scroller.scrollTop = Math.max(0, top - peek)
  }, [state.day, tab, state.snap, poll?.question, focus, plans])
  const gap = pastDay ? undefined : plans.find((stop) => stop.kind === "gap")
  const addLabel = done || tab === "photos" ? "Add photo" : tab === "expenses" ? "Add bill" : tab === "docs" ? "Add document" : "Add to itinerary"

  function add() {
    if (done || tab === "photos") photoRef.current?.click()
    else if (tab === "expenses") dispatch({ type: "overlay", overlay: "bill" })
    else if (tab === "docs") fileRef.current?.click()
    else dispatch({ type: "overlay", overlay: "poll", anchor: gap?.id ?? null, voting: true })
  }

  function sharePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      dispatch({ type: "toast", toast: "Choose a photo to share.", tone: "error" })
      return
    }
    const day = state.day
    const stampId = trips.find((item) => item.id === state.trip)?.stampIds[0] ?? null
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") return
      const id = `up-${Date.now()}`
      dispatch({ type: "add-photo", photo: { id, src: reader.result, by: "ari", day, stampId } })
      if (tab !== "photos") dispatch({ type: "trip-tab", tab: "photos" })
      setOpenPhoto(id)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={tab === "docs" ? "sheet itinerary hug" : "sheet itinerary"}>
      <span className="handle" />
      <div className="itinerary-col">
        <div className="itinerary-intro">
          <header className="trip-head">
            <h1>{head.title}</h1>
            <button type="button" className="head-avatars" onClick={() => dispatch({ type: "sheet", sheet: "group" })} aria-label="Group">
              <PhotoStack kind="header" ids={head.members} extra={head.extra} />
            </button>
          </header>
          <p className="trip-dates">
            <img className="asset" src="/assets/icons/calendar.svg" alt="" /> {head.dates}
          </p>
        </div>
        <div className="itinerary-main">
          <div className="seg">
            {(["itinerary", "expenses", "docs", "photos"] as const).map((item) => (
              <button key={item} type="button" className={tab === item ? "on" : ""} onClick={() => dispatch({ type: "trip-tab", tab: item })}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <div className="day-and-plans">
            {(tab === "itinerary" || (tab === "photos" && !future)) && <DayStrip day={state.day} onPick={(day) => dispatch({ type: "day", day })} />}
            <div className={tab === "docs" ? "plans" : "plans masked"} ref={plansRef} data-vaul-no-drag>
              {tab === "itinerary" && (
                <div className="cards">
                  {poll?.anchorStopId ? (
                    plans.map((stop) => (stop.id === poll.anchorStopId ? <PollCard key="poll" /> : <StopCard key={stop.id} stop={stop} />))
                  ) : (
                    <>
                      {plans.filter((stop) => !stop.afterPoll).map((stop) => (
                        <StopCard key={stop.id} stop={stop} />
                      ))}
                      {poll && <PollCard />}
                      {plans.filter((stop) => stop.afterPoll).map((stop) => (
                        <StopCard key={stop.id} stop={stop} />
                      ))}
                    </>
                  )}
                </div>
              )}
              {tab === "expenses" &&
                (future ? (
                  <p className="empty">No expenses yet. Bills show up here once the trip starts.</p>
                ) : isPastTrip(state.trip) ? (
                  <Expenses items={pastExpenses[state.trip]} settled />
                ) : (
                  <Expenses items={state.expenses} />
                ))}
              {tab === "docs" && <Docs docs={docs} />}
              {tab === "photos" &&
                (future ? (
                  <p className="album-empty">No photos yet. The album opens when the trip starts.</p>
                ) : (
                  <Album day={state.day} openId={openPhoto} onOpen={setOpenPhoto} />
                ))}
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const parsed = docs.filter((doc) => doc.ticket && parsedTickets.includes(doc.ticket)).length
          const ticket = tickets[parsedTickets[parsed % parsedTickets.length]]
          setDocs((current) => [
            ...current,
            {
              id: `${file.name}-${current.length}`,
              title: `${ticket.from.city} → ${ticket.to.city}`,
              detail: `${ticket.title} · ${ticket.date}`,
              kind: "ticket",
              overlay: "ticket",
              ticket: ticket.id,
            },
          ])
          dispatch({ type: "toast", toast: `Ticket read from ${file.name}.` })
          event.target.value = ""
        }}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) sharePhoto(file)
          event.target.value = ""
        }}
      />
      <Toolbar variant="sheet" lead={<ToolIcon label="Back" icon="back" onClick={() => dispatch({ type: "back" })} />}>
        {tab === "itinerary" && !future && !done && <ToolIcon label="Edit trip" icon="pencil" onClick={() => dispatch({ type: "overlay", overlay: "edit" })} />}
        {(done || (!(tab === "itinerary" && pastDay) && !(tab === "expenses" && future) && !(tab === "photos" && future))) && (
          <ToolAction label={addLabel} icon="plus" onClick={add} />
        )}
      </Toolbar>
    </div>
  )
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3
  return (x: number) => {
    let [lo, hi] = [0, 1]
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

const sheetEase = bezier(0.32, 0.72, 0, 1)
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const GLIDE_MS = 450
const PLANS_FADE = 118
const GRABS = ["pointerdown", "wheel", "touchstart"] as const

function findCard(scroller: HTMLElement, id: string, plans: Stop[]) {
  const card = scroller.querySelector<HTMLElement>(`[data-stop="${CSS.escape(id)}"]`)
  if (card || plans.some((stop) => stop.id === id)) return card
  return scroller.querySelector<HTMLElement>('[data-stop="poll"]')
}

function centered(scroller: HTMLElement, card: HTMLElement) {
  const top = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  const view = scroller.clientHeight - PLANS_FADE
  const goal = top - Math.max(16, (view - card.offsetHeight) / 2)
  return Math.min(Math.max(0, goal), scroller.scrollHeight - scroller.clientHeight)
}

// The goal is re-read every frame: on first open the sheet is still settling its height.
function glide(scroller: HTMLElement, goal: () => number, card: HTMLElement) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scroller.scrollTop = goal()
    flash(card)
    return () => false
  }
  const from = scroller.scrollTop
  let start = 0
  let running = true
  let frame = requestAnimationFrame(function step(now) {
    start ||= now
    const t = Math.min((now - start) / GLIDE_MS, 1)
    scroller.scrollTop = from + (goal() - from) * sheetEase(t)
    if (t < 1) frame = requestAnimationFrame(step)
    else end(true)
  })
  const grab = () => end(true)
  const end = (highlight: boolean) => {
    if (!running) return false
    running = false
    cancelAnimationFrame(frame)
    for (const type of GRABS) scroller.removeEventListener(type, grab)
    if (highlight) flash(card)
    return true
  }
  for (const type of GRABS) scroller.addEventListener(type, grab, { passive: true })
  return () => end(false)
}

function flash(card: HTMLElement) {
  card.animate(
    [
      { opacity: 0, easing: EASE_OUT },
      { opacity: 1, offset: 0.3 },
      { opacity: 1, offset: 0.45, easing: "ease" },
      { opacity: 0 },
    ],
    { duration: 1200, pseudoElement: "::after" },
  )
}

function StopCard({ stop }: { stop: Stop }) {
  const { state, dispatch } = useStore()
  if (stop.kind === "gap") {
    if (isPastDay(state.day)) {
      return (
        <article className="card gap past" data-stop={stop.id}>
          <div className="gap-head">
            <strong>Free time</strong>
            <span>{stop.time}</span>
          </div>
        </article>
      )
    }
    return (
      <article className="card gap" data-stop={stop.id}>
        <div className="gap-head">
          <strong>No plans? Let’s fill in the gap!</strong>
          <span>{stop.time}</span>
        </div>
        <div className="gap-actions">
          <button type="button" className="open-poll" onClick={() => dispatch({ type: "overlay", overlay: "poll", anchor: stop.id, voting: true })}>
            <img className="asset" src="/assets/icons/poll-open.svg" alt="" />
            Open poll
          </button>
          <button type="button" onClick={() => dispatch({ type: "overlay", overlay: "poll", anchor: stop.id, voting: false })}>
            <img className="asset" src="/assets/icons/plus.svg" alt="" />
            Add to itinerary
          </button>
        </div>
      </article>
    )
  }
  const spot = mapPaths(TODAY).spots.get(stopKey(state.day, stop.id))
  const tap = (event: ReactMouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest("button")) return
    if (spot) dispatch({ type: "focus-stop", id: stop.id, coord: spot })
    else flash(event.currentTarget)
  }
  const card = (
    <article className={stop.tone === "now" ? "card now tappable" : "card tappable"} data-stop={stop.id === "poll-result" ? "poll" : stop.id} onClick={tap}>
      <div className="card-meta">
        <span>{stop.time}</span>
        <em>{stop.status}</em>
      </div>
      <div className="card-title">
        <span>
          <ActivityIcon stop={stop} />
          {stop.title}
        </span>
        <PhotoStack kind="card" ids={stop.people} surface="grey" />
      </div>
      {stop.bill && (
        <button type="button" className="add-bill" onClick={() => dispatch({ type: "overlay", overlay: "bill" })}>
          <img src="/assets/icons/plus.svg" alt="" />
          Add bill
        </button>
      )}
    </article>
  )
  if (stop.id === "poll-result") return card
  return (
    <SwipeRow
      actions={[
        { label: "Edit", tone: "edit", icon: <IconPencil />, onClick: () => dispatch({ type: "toast", toast: "Editing activities is off in the demo." }) },
        { label: "Delete", tone: "delete", icon: <IconTrash />, onClick: () => dispatch({ type: "remove-stop", id: stopKey(state.day, stop.id), name: stop.title }) },
      ]}
    >
      {card}
    </SwipeRow>
  )
}

function DayStrip({ day, onPick }: { day: DayId; onPick: (day: DayId) => void }) {
  const { state } = useStore()
  const items = tripDays(state.trip)
  const many = items.length > 4
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = strip.current
    if (!el || !many) return
    const step = () => el.querySelector<HTMLElement>(".day")?.offsetWidth || el.clientWidth / 4
    let resnap = 0
    const glide = (index: number) => {
      el.style.scrollSnapType = "none"
      window.clearTimeout(resnap)
      resnap = window.setTimeout(() => (el.style.scrollSnapType = ""), 700)
      el.scrollTo({ left: index * step(), behavior: "smooth" })
    }
    let wheelLock = 0
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      event.preventDefault()
      if (event.timeStamp < wheelLock) return
      wheelLock = event.timeStamp + 260
      glide(Math.round(el.scrollLeft / step()) + Math.sign(event.deltaY))
    }
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return
      const startX = event.clientX
      const startLeft = el.scrollLeft
      let moved = false
      el.style.scrollSnapType = "none"
      const onMove = (move: PointerEvent) => {
        const dx = move.clientX - startX
        if (Math.abs(dx) > 4) moved = true
        el.scrollLeft = startLeft - dx
      }
      const onUp = (up: PointerEvent) => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        const dx = up.clientX - startX
        const from = startLeft / step()
        const flick = Math.abs(dx) > step() * 0.2 ? -Math.sign(dx) : 0
        glide(flick ? Math.round(from - dx / step() + flick * 0.3) : Math.round(el.scrollLeft / step()))
        if (!moved) return
        const swallow = (click: MouseEvent) => {
          click.stopPropagation()
          click.preventDefault()
        }
        el.addEventListener("click", swallow, { capture: true, once: true })
        window.setTimeout(() => el.removeEventListener("click", swallow, { capture: true }), 0)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerdown", onDown)
    return () => {
      window.clearTimeout(resnap)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onDown)
    }
  }, [many])
  return (
    <div ref={strip} className={many ? "days many" : "days"} style={{ "--n": items.length } as CSSProperties} data-vaul-no-drag>
      <DaySegments fills={items.map((item) => item.progress)} />
      <div className="day-row">
        {items.map((item) => (
          <button key={item.id} type="button" className={item.id === day ? "day on" : "day"} onClick={() => onPick(item.id)}>
            <small>{item.dow}</small>
            <strong>{item.date}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function winner(poll: Poll) {
  return poll.options.reduce((best, option) => (option.votes.length > best.votes.length ? option : best), poll.options[0])
}

function PollCard() {
  const { state, dispatch } = useStore()
  const poll = state.pollByDay[state.day]
  if (!poll || poll.options.length === 0) return null
  const mine = "ari"
  const ballots = new Set(poll.options.flatMap((option) => option.votes))
  const groupSize = state.members.length + 1
  if (poll.decided || ballots.size >= groupSize) {
    const top = winner(poll)
    const name = place(top.id)?.name ?? top.name ?? "Plan"
    return (
      <StopCard
        stop={{
          id: "poll-result",
          time: `${poll.from}–${poll.to}`,
          tone: "muted",
          status: poll.status ?? (top.votes.length > 0 ? "voted" : "planned"),
          title: name,
          people: top.votes.length > 0 ? top.votes : ["ari"],
          kind: "food",
        }}
      />
    )
  }
  const hasVoted = Boolean(poll.revealed) || poll.options.some((option) => option.votes.includes(mine))
  if (!hasVoted) {
    return (
      <article className="card poll pending" data-stop="poll">
        <div className="card-meta">
          <span className="poll-when">
            <b>{poll.from}–{poll.to}</b>
            <img className="asset" src="/assets/icons/dot.svg" alt="" />
            <em>poll ongoing</em>
          </span>
          <em className="poll-votes">0 votes</em>
        </div>
        <h3>{poll.question}</h3>
        <div className="poll-options">
          {poll.options.map((option) => {
            const info = place(option.id)
            const name = info?.name ?? option.name ?? "Option"
            return (
              <button key={option.id} type="button" className="poll-choice" onClick={() => dispatch({ type: "vote", optionId: option.id })}>
                <span className="poll-choice-main">
                  {info?.photo ? <img className="poll-thumb" src={info.photo} alt="" /> : <span className="option-ph" />}
                  <span>
                    <strong>{name}</strong>
                    {info?.detail && <em>{info.detail}</em>}
                  </span>
                </span>
                <i className="box" />
              </button>
            )
          })}
        </div>
        <button type="button" className="poll-add" onClick={() => dispatch({ type: "overlay", overlay: "poll", voting: true })}>
          <img className="asset" src="/assets/icons/plus.svg" alt="" />
          Add option
        </button>
      </article>
    )
  }
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0)
  const most = Math.max(...poll.options.map((item) => item.votes.length))
  return (
    <article className="card poll" data-stop="poll">
      <div className="card-meta">
        <span className="poll-when">
          <b>{poll.from}–{poll.to}</b>
          <img className="asset" src="/assets/icons/dot.svg" alt="" />
          <em>poll ongoing</em>
        </span>
        <em className="poll-votes">
          {ballots.size}/{groupSize} votes
        </em>
      </div>
      <h3>{poll.question}</h3>
      {poll.options.map((option, index) => {
        const info = place(option.id)
        const name = info?.name ?? option.name ?? "Option"
        const pct = totalVotes === 0 ? 0 : Math.round((option.votes.length / totalVotes) * 100)
        const leading = option.votes.length > 0 && option.votes.length === most
        return (
          <button key={option.id} type="button" className="option" onClick={() => dispatch({ type: "vote", optionId: option.id })}>
            {info?.photo ? <img src={info.photo} alt="" /> : <span className="option-ph" />}
            <span className="option-body">
              <span className="option-name">
                <span className={index === 1 ? "" : "light"}>
                  {name} <img className="asset" src="/assets/icons/link.svg" alt="" />
                </span>
                {poll.showVoters && option.votes.length > 0 && (
                  <span className="voters">
                    <b>{option.votes.length}</b>
                    <PhotoStack kind="vote" ids={option.votes} />
                  </span>
                )}
              </span>
              <span className="bar">
                {pct > 0 && (
                  <i className={leading ? "lead" : ""} style={{ width: `${Math.max(pct, 22)}%` }}>
                    <em>
                      {option.votes.includes(mine) && <img className="asset" src="/assets/icons/vote-check.svg" alt="" />}
                      {pct}%
                    </em>
                  </i>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </article>
  )
}

type ExpenseFilter = "all" | "you" | "others"
type ExpenseSort = "recent" | "amount"

const filterLabels: Record<ExpenseFilter, string> = { all: "All expenses", you: "Paid by you", others: "Paid by others" }
const sortLabels: Record<ExpenseSort, string> = { recent: "Most recent", amount: "Highest amount" }

function payer(item: Expense) {
  return item.paidBy === "you" ? "you" : (person(item.paidBy)?.name.split(" ")[0] ?? item.paidBy)
}

const money = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2).replace(".", ",")} €`
const cents = (value: number) => Math.round(value * 100) / 100

function stake(item: Expense, settled: boolean) {
  const share = cents(item.amount / item.split)
  if (settled) return { tone: "", text: `your share ${money(share)}` }
  if (item.paidBy === "you") return { tone: "lent", text: `you lent ${money(cents(item.amount - share))}` }
  return { tone: "owe", text: `you owe ${money(share)}` }
}

function Expenses({ items: all, settled = false }: { items: Expense[]; settled?: boolean }) {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState<ExpenseFilter>("all")
  const [sort, setSort] = useState<ExpenseSort>("recent")
  const [menu, setMenu] = useState<"filter" | "sort" | null>(null)
  const total = all.reduce((sum, item) => sum + item.amount, 0)
  const mine = all.filter((item) => item.paidBy === "you").reduce((sum, item) => sum + item.amount, 0)
  const visible = all
    .filter((item) => filter === "all" || (filter === "you" ? item.paidBy === "you" : item.paidBy !== "you"))
    .sort((a, b) => (sort === "amount" ? b.amount - a.amount : b.order - a.order))
  const groups =
    sort === "amount"
      ? [["By amount", visible] as const]
      : Object.entries(
          visible.reduce<Record<string, Expense[]>>((acc, item) => {
            acc[item.day] = [...(acc[item.day] ?? []), item]
            return acc
          }, {}),
        )
  return (
    <div className="expenses">
      <div className="owed">
        {settled ? (
          <>
            <p>Your share · all settled up</p>
            <div className="owed-row">
              <strong>{Math.round(all.reduce((sum, item) => sum + item.amount / item.split, 0))} €</strong>
            </div>
          </>
        ) : (
          <>
            <p className="owed-by">
              <AvatarStack ids={state.summary.owedBy.map((item) => item.id)} size={20} />
              You are owed by {state.summary.owedBy.length} people
            </p>
            <div className="owed-row">
              <strong>{money(state.summary.owed)}</strong>
              <button type="button" onClick={() => dispatch({ type: "sheet", sheet: "balances" })}>
                Balances <IconChevron />
              </button>
            </div>
          </>
        )}
        <div className="stats">
          <span>
            <small>Group total</small>
            {money(total)}
          </span>
          <span>
            <small>Expenses</small>
            {all.length}
          </span>
          <span>
            <small>You paid</small>
            {money(mine)}
          </span>
        </div>
      </div>
      <div className="expense-head">
        <h3>Expenses</h3>
        <span>
          <button
            type="button"
            aria-label="Filter expenses"
            aria-expanded={menu === "filter"}
            className={filter !== "all" ? "tool on" : "tool"}
            onClick={() => setMenu((open) => (open === "filter" ? null : "filter"))}
          >
            <img className="asset" src="/assets/icons/filter.svg" alt="" />
          </button>
          <button
            type="button"
            aria-label="Sort expenses"
            aria-expanded={menu === "sort"}
            className={sort !== "recent" ? "tool on" : "tool"}
            onClick={() => setMenu((open) => (open === "sort" ? null : "sort"))}
          >
            <img className="asset" src="/assets/icons/sort.svg" alt="" />
          </button>
        </span>
        {menu && (
          <div className="menu" role="menu">
            {(menu === "filter" ? (Object.keys(filterLabels) as ExpenseFilter[]) : (Object.keys(sortLabels) as ExpenseSort[])).map((value) => {
              const on = menu === "filter" ? filter === value : sort === value
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  className={on ? "on" : ""}
                  onClick={() => {
                    if (menu === "filter") setFilter(value as ExpenseFilter)
                    else setSort(value as ExpenseSort)
                    setMenu(null)
                  }}
                >
                  {menu === "filter" ? filterLabels[value as ExpenseFilter] : sortLabels[value as ExpenseSort]}
                  {on && <img className="asset" src="/assets/icons/check.svg" alt="" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {filter !== "all" && (
        <button type="button" className="chip" onClick={() => setFilter("all")}>
          {filterLabels[filter]} <span aria-hidden="true">×</span>
        </button>
      )}
      {groups.length === 0 && <p className="empty">No expenses match this filter.</p>}
      {groups.map(([day, items]) => (
        <section key={day}>
          <div className="expense-day">
            <span>{day}</span>
            <b>{money(items.reduce((sum, item) => sum + item.amount, 0))}</b>
          </div>
          {items.map((item) => {
            const mine = stake(item, settled)
            return (
              <div key={item.id} className="expense-row">
                <div className="expense-main">
                  <span>{item.title}</span>
                  <small>
                    {item.paidBy === "you" ? "You" : payer(item)} paid · split {item.split} ways
                  </small>
                </div>
                <div className="expense-amt">
                  <strong>{money(item.amount)}</strong>
                  <em className={mine.tone}>{mine.text}</em>
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function Album({ day, openId, onOpen }: { day: DayId; openId: string | null; onOpen: (id: string | null) => void }) {
  const { state } = useStore()
  const items = state.photos.filter((photo) => photo.day === day)
  const open = items.find((photo) => photo.id === openId)
  if (open) return <PhotoView photo={open} onClose={() => onOpen(null)} />
  if (items.length === 0) return <p className="album-empty">No photos from this day yet. Add one and everyone on the trip can see it.</p>
  return (
    <div className="album">
      {items.map((photo) => {
        const who = person(photo.by)
        return (
          <button key={photo.id} type="button" className="album-shot" aria-label={who ? `${who.name}'s photo` : "Trip photo"} onClick={() => onOpen(photo.id)}>
            <img src={photo.src} alt="" />
            <Face id={photo.by} size={22} />
          </button>
        )
      })}
    </div>
  )
}

function PhotoView({ photo, onClose }: { photo: SharedPhoto; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const who = person(photo.by)
  const stamp = passportStamps.find((item) => item.id === photo.stampId)
  const cover = stamp ? (state.stampCovers[stamp.id] ?? stamp.image) : null
  const chosen = cover === photo.src
  return (
    <div className="photo-view">
      <button type="button" className="photo-back" onClick={onClose}>
        All photos
      </button>
      <div className="photo-frame">
        <img src={photo.src} alt="" />
        <div className="photo-meta">
          <Face id={photo.by} size={32} />
          <span>
            <strong>{who?.name ?? "Someone"}</strong>
            <em>Shared with the group</em>
          </span>
          {stamp && (
            <button
              type="button"
              className={chosen ? "like on" : "like"}
              aria-pressed={chosen}
              aria-label={chosen ? "Stamp photo" : "Use as stamp photo"}
              onClick={() => !chosen && dispatch({ type: "stamp-cover", id: stamp.id, src: photo.src })}
            >
              <Heart />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.3s-7.6-4.6-9.2-9.3C1.7 7.6 3.9 4.4 7.3 4.4c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.6 3.2 4.5 6.6-1.6 4.7-9.2 9.3-9.2 9.3Z" />
    </svg>
  )
}

function Docs({ docs }: { docs: Doc[] }) {
  const { dispatch } = useStore()
  return (
    <div className="docs">
      {docs.map((doc) => (
        <button
          key={doc.id}
          type="button"
          className="doc"
          onClick={() => (doc.overlay ? dispatch({ type: "overlay", overlay: doc.overlay, anchor: doc.ticket }) : dispatch({ type: "toast", toast: `${doc.title} is ready to share.` }))}
        >
          <span className="doc-icon">
            <img className="asset" src={`/assets/icons/${doc.kind === "link" ? "link" : doc.kind === "ticket" ? "ticket" : "file"}-blue.svg`} alt="" />
          </span>
          <span className="doc-text">
            <strong>{doc.title}</strong>
            <em>{doc.detail}</em>
          </span>
          <IconChevron dark />
        </button>
      ))}
    </div>
  )
}

function GroupSheet() {
  const { state, dispatch } = useStore()
  const head = useTripHead()
  return (
    <div className="sheet group">
      <span className="handle" />
      <div className="sheet-scroll">
        <header className="trip-head">
          <h1>{head.title}</h1>
        </header>
        <p className="members-label">{head.members.length} {head.members.length === 1 ? "member" : "members"}</p>
        <ul className="member-list">
          {head.members.map((id) => {
            const item = person(id)
            if (!item) return null
            return (
              <li key={id}>
                <Face id={id} />
                <PersonName id={id} />
              </li>
            )
          })}
        </ul>
      </div>
      <Toolbar variant="sheet" lead={<ToolIcon label="Back" icon="back" onClick={() => dispatch({ type: "back" })} />}>
        {!isPastTrip(state.trip) && <ToolAction label="Add members" icon="plus" onClick={() => dispatch({ type: "overlay", overlay: "invite" })} />}
      </Toolbar>
    </div>
  )
}

export function BalancesSheet() {
  const { state, dispatch } = useStore()
  return (
    <div className="sub-layer">
      <button type="button" className="scrim" aria-label="Close balances" onClick={() => dispatch({ type: "back" })} />
      <div className="sub-sheet" role="dialog" aria-label="Balances">
        <header className="trip-head">
          <h1>Balances</h1>
        </header>
        <p className="members-label">You are owed {state.summary.owed} €</p>
        <ul className="member-list">
          {state.summary.owedBy.map((item) => {
            const who = person(item.id)
            if (!who) return null
            return (
              <li key={item.id}>
                <Face id={item.id} />
                <PersonName id={item.id} />
                <b className="owe">{item.amount} €</b>
              </li>
            )
          })}
        </ul>
        <Toolbar variant="sheet" lead={<ToolIcon label="Back" icon="back" onClick={() => dispatch({ type: "back" })} />}>
          <ToolAction label="Remind them" onClick={() => dispatch({ type: "toast", toast: "Reminder sent to Ben and Sara." })} />
        </Toolbar>
      </div>
    </div>
  )
}
