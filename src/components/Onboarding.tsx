import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { globePlaces, initialExpenses, passportArcs, passportStamps, people, tuesdayPoll } from "../data"
import { STYLE_URL, applyPalette, daylight } from "../mapStyle"
import { dotTimes, playRoute, revealMs } from "../globeReveal"
import { dayStops, place } from "../state"
import { StampArt } from "./Passport"
import { NowTag } from "./TripSheet"
import { AvatarStack, PhotoStack, StatusBar } from "./chrome"
import { ActivityIcon, IconChevron } from "./icons"

/* ─────────────────────────────────────────────────────────
 * ONBOARDING · the app's story in four swipes
 *
 *   1  splash      the laminated logo stamp turns slowly in the light; drag it to tilt it yourself
 *   2  trips       the map settles, the route draws, you land on it, the drawer rises with today and the poll
 *   3  expenses    each bill lands on the pile and updates the balance card above it
 *   4  passport    the Passport globe tells the route city by city, each line travelling to the next; stamps deal on arrival
 *
 * Every launch starts here, whichever way the app was opened; Skip or the last button leaves.
 * ───────────────────────────────────────────────────────── */

const PAGES = ["splash", "trips", "expenses", "passport"] as const
const SWIPE_PX = 48
const FLICK = 0.4

const stamp = (id: string) => passportStamps.find((item) => item.id === id)!

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  const drag = useRef<{ x: number; y: number; t: number; axis: "x" | "y" | null } | null>(null)
  const last = page === PAGES.length - 1
  const go = (next: number) => setPage(Math.max(0, Math.min(PAGES.length - 1, next)))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(page + 1)
      if (event.key === "ArrowLeft") go(page - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("button, [data-onb-tilt]")) return
    drag.current = { x: event.clientX, y: event.clientY, t: event.timeStamp, axis: null }
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    const x = event.clientX - start.x
    if (!start.axis) {
      if (Math.abs(x) < 8 && Math.abs(event.clientY - start.y) < 8) return
      start.axis = Math.abs(x) > Math.abs(event.clientY - start.y) ? "x" : "y"
      if (start.axis === "x") event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (start.axis !== "x") return
    // The first page is where the story starts, so it doesn't pull back past its edge at all; the last one rubber-bands.
    if (page === 0 && x > 0) return setDx(0)
    setDx(last && x < 0 ? x * 0.3 : x)
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    drag.current = null
    if (!start || start.axis !== "x") return setDx(0)
    const x = event.clientX - start.x
    const speed = x / Math.max(event.timeStamp - start.t, 1)
    if (x < -SWIPE_PX || speed < -FLICK) go(page + 1)
    else if (x > SWIPE_PX || speed > FLICK) go(page - 1)
    setDx(0)
  }

  return (
    <div className="onb" data-page={PAGES[page]} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <StatusBar light={page === 0} island={false} />
      <button type="button" className={last ? "onb-skip away" : "onb-skip"} onClick={onDone} tabIndex={last ? -1 : 0}>
        Skip
      </button>
      <div className={dx ? "onb-track dragging" : "onb-track"} style={{ transform: `translateX(calc(${-page * 100}% + ${dx}px))` }}>
        <Page on={page === 0} kind="splash" visual={<Splash />} title={"Plan the trip.\nShare the moments."} body="Your trips, your friends and every memory, in one place." />
        <Page
          on={page === 1}
          kind="trips"
          visual={<TripsVisual on={page === 1} />}
          title="Plan it together"
          body="Create a trip, invite your friends and settle every plan with a quick poll. Then follow the day live on the map."
        />
        <Page
          on={page === 2}
          kind="expenses"
          visual={<ExpensesVisual on={page === 2} />}
          title="Split costs, not friendships"
          body="Add a bill in seconds, split it with whoever came along and always know who owes what."
        />
        <Page
          on={page === 3}
          kind="passport"
          visual={<PassportVisual on={page === 3} near={page >= 2} />}
          title="Your Passport fills itself"
          body="Every trip you finish lands in your Passport as a stamp. Countries, cities and nights away add up as you level up as an explorer."
        />
      </div>
      <footer className="onb-foot">
        <div className="onb-dots" role="tablist" aria-label="Onboarding pages">
          {PAGES.map((id, index) => (
            <button key={id} type="button" role="tab" aria-selected={index === page} aria-label={`Page ${index + 1}`} className={index === page ? "on" : ""} onClick={() => go(index)} />
          ))}
        </div>
        <button type="button" className="onb-next" onClick={() => (last ? onDone() : go(page + 1))}>
          {page === 0 ? "Get started" : last ? "Start exploring" : "Next"}
        </button>
      </footer>
    </div>
  )
}

function Page({ on, kind, visual, title, body }: { on: boolean; kind: string; visual: ReactNode; title: string; body: string }) {
  return (
    <section className={on ? `onb-page onb-${kind} on` : `onb-page onb-${kind}`} aria-hidden={!on}>
      <div className="onb-visual">{visual}</div>
      <div className="onb-copy">
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </section>
  )
}

const TILT_MAX = 32

// The app icon's stamp, huge, under the same laminate as the passport stamps. It sways on its own; grab it and it
// follows the finger, the sheen sliding with it, then springs back into the sway on release.
function Splash() {
  const [tilt, setTilt] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const clamp = (value: number) => Math.max(-TILT_MAX, Math.min(TILT_MAX, value))
  function follow(event: ReactPointerEvent<HTMLDivElement>) {
    if (!start.current) return
    const box = event.currentTarget.getBoundingClientRect()
    setTilt({
      y: clamp((event.clientX - start.current.x) * 0.35),
      x: clamp(-(event.clientY - start.current.y) * 0.35),
      px: Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
      py: Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
    })
  }
  function release() {
    start.current = null
    setTilt(null)
  }
  const sheen = tilt
    ? ({
        "--pointer-x": `${tilt.px}%`,
        "--pointer-y": `${tilt.py}%`,
        "--background-x": `${37 + tilt.px * 0.26}%`,
        "--background-y": `${33 + tilt.py * 0.34}%`,
        "--card-opacity": 1,
      } as CSSProperties)
    : undefined
  return (
    <>
      <img className="onb-sunrise" src="/assets/brand/icon-sunrise.svg" alt="" />
      <div
        className={tilt ? "onb-logo-tilt grabbed" : "onb-logo-tilt"}
        data-onb-tilt
        style={{ transform: tilt ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          start.current = { x: event.clientX, y: event.clientY }
          follow(event)
        }}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className="onb-logo-wrap">
          <div className="app-icon-stamp onb-logo" style={sheen}>
            <img className="app-icon-paper" src="/assets/brand/icon-stamp.svg" alt="" draggable={false} />
            <img className="app-icon-art" src="/assets/brand/icon-landscape.svg" alt="" draggable={false} />
            <b>TripUp</b>
            <span className="stamp-holo stamp-holo-shine" aria-hidden="true" />
            <span className="stamp-holo stamp-holo-glare" aria-hidden="true" />
            <span className="stamp-holo stamp-holo-paper" aria-hidden="true" />
          </div>
        </div>
      </div>
    </>
  )
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches

const easeOut = (t: number) => 1 - (1 - t) ** 3
const linear = (t: number) => t

// Counts up to `to` once the page is on screen; shows the final value straight away when motion is reduced.
function useCount(to: number, on: boolean, ms = 1100, delay = 350, ease = easeOut) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!on || reduceMotion()) return
    let frame = 0
    const begin = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - begin) / ms, 0), 1)
      setProgress(ease(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setProgress(0)
    }
  }, [on, ms, delay, ease])
  if (!on) return 0
  return reduceMotion() ? to : to * progress
}

const nowStop = dayStops("tue").find((item) => item.tone === "now")!
const pollTotal = tuesdayPoll.options.reduce((sum, option) => sum + option.votes.length, 0)
const pollOptions = tuesdayPoll.options.slice(0, 2)

// The poll is played as a vote: it arrives unanswered, the first option is tapped and ticked, then it turns into the
// results with the bars filling. Seconds from the page arriving.
const POLL_TAP = 3.05
const POLL_RESULTS = 3.45

function usePollPhase(on: boolean) {
  const [phase, setPhase] = useState<"ask" | "tap" | "voted">("ask")
  useEffect(() => {
    if (!on) return
    if (reduceMotion()) {
      const id = window.setTimeout(() => setPhase("voted"), 0)
      return () => window.clearTimeout(id)
    }
    const timers = [window.setTimeout(() => setPhase("tap"), POLL_TAP * 1000), window.setTimeout(() => setPhase("voted"), POLL_RESULTS * 1000)]
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      setPhase("ask")
    }
  }, [on])
  return on ? phase : "ask"
}

// The real itinerary pieces: the map above, and in the sheet today's activity and the dinner poll with two options.
function TripsVisual({ on }: { on: boolean }) {
  const phase = usePollPhase(on)
  return (
    <div className="onb-trip">
      <div className="onb-map">
        <img className="onb-map-bg" src="/assets/home/map-shot.png" alt="" draggable={false} />
        <svg className="onb-route" viewBox="0 0 330 210" aria-hidden="true">
          <path className="onb-route-past" pathLength={1} d="M78 18 C 92 52, 70 84, 104 110 S 140 140, 168 132" />
          <path className="onb-route-future" d="M168 132 C 204 124, 226 146, 246 160 S 284 176, 306 168" />
          <circle className="onb-stop past" cx="78" cy="18" r="7.15" style={{ "--d": "0.2s" } as CSSProperties} />
          <circle className="onb-stop past" cx="104" cy="110" r="7.15" style={{ "--d": "0.6s" } as CSSProperties} />
          <circle className="onb-stop future" cx="246" cy="160" r="7.12" style={{ "--d": "1.4s" } as CSSProperties} />
          <circle className="onb-stop future" cx="306" cy="168" r="7.12" style={{ "--d": "1.55s" } as CSSProperties} />
          <g className="onb-here">
            <circle className="onb-here-halo" cx="168" cy="132" r="24" />
            <circle className="onb-here-pulse" cx="168" cy="132" r="24" />
            <g className="onb-here-pin">
              <circle cx="168" cy="132" r="11" fill="#fff" stroke="#2b59f0" />
              <circle cx="168" cy="132" r="6" fill="#2b59f0" />
            </g>
          </g>
        </svg>
      </div>
      <div className="onb-sheet">
        <article className="card now onb-rise" style={{ "--d": "1.9s" } as CSSProperties}>
          <NowTag className="on-card" />
          <div className="card-meta">
            <span>{nowStop.time}</span>
            <em>{nowStop.status}</em>
          </div>
          <div className="card-title">
            <span>
              <ActivityIcon stop={nowStop} />
              {nowStop.title}
            </span>
            <PhotoStack kind="card" ids={nowStop.people} surface="grey" />
          </div>
        </article>
        <article className="card poll onb-rise" data-phase={phase} style={{ "--d": "2.15s" } as CSSProperties}>
          <div className="card-meta">
            <span className="poll-when">
              <b>
                {tuesdayPoll.from}–{tuesdayPoll.to}
              </b>
              <img className="asset" src="/assets/icons/dot.svg" alt="" />
              <em>poll ongoing</em>
            </span>
            <em className="poll-votes">{phase === "voted" ? "4/5 votes" : "3/5 votes"}</em>
          </div>
          <h3 className="onb-step" style={{ "--d": "2.3s" } as CSSProperties}>
            {tuesdayPoll.question}
          </h3>
          <div className="onb-poll-body">
            <div className="poll-options onb-poll-ask">
              {pollOptions.map((option, index) => {
                const info = place(option.id)
                return (
                  <div key={option.id} className={index === 0 ? "poll-choice onb-step picked" : "poll-choice onb-step"} style={{ "--d": `${2.4 + index * 0.08}s` } as CSSProperties}>
                    <span className="poll-choice-main">
                      {info?.photo ? <img className="poll-thumb" src={info.photo} alt="" /> : <span className="option-ph" />}
                      <span>
                        <strong>{info?.name}</strong>
                        {info?.detail && <em>{info.detail}</em>}
                      </span>
                    </span>
                    <i className="box">{index === 0 && phase !== "ask" && <img className="asset" src="/assets/icons/check.svg" alt="" />}</i>
                  </div>
                )
              })}
            </div>
            <div className="onb-poll-results">
              {pollOptions.map((option, index) => {
                const info = place(option.id)
                const pct = Math.round((option.votes.length / pollTotal) * 100)
                return (
                  <div key={option.id} className="option">
                    {info?.photo ? <img src={info.photo} alt="" /> : <span className="option-ph" />}
                    <span className="option-body">
                      <span className="option-name">
                        <span className={index === 0 ? "" : "light"}>
                          {info?.name} <img className="asset" src="/assets/icons/link.svg" alt="" />
                        </span>
                        <span className="voters">
                          <b>{option.votes.length}</b>
                          <PhotoStack kind="vote" ids={option.votes} />
                        </span>
                      </span>
                      <span className="bar">
                        <i className={index === 0 ? "lead" : ""} style={{ width: `${Math.max(pct, 22)}%`, "--d": `${index * 0.1}s` } as CSSProperties}>
                          <em>
                            {option.votes.includes("ari") && <img className="asset" src="/assets/icons/vote-check.svg" alt="" />}
                            {pct}%
                          </em>
                        </i>
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

const money = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2).replace(".", ",")} €`
const groupTotal = initialExpenses.reduce((sum, item) => sum + item.amount, 0)
const youPaid = initialExpenses.filter((item) => item.paidBy === "you").reduce((sum, item) => sum + item.amount, 0)
// Five bills land, one every beat, then the pile rests. Each move lasts the whole beat (index.css), so the pile and the
// numbers flow from one bill into the next without stopping.
const BILLS = 5
const STACK_EVERY = 650

function stakeOf(item: (typeof initialExpenses)[number]) {
  const share = Math.round((item.amount / item.split) * 100) / 100
  return item.paidBy === "you"
    ? { tone: "lent", text: `you lent ${money(Math.round((item.amount - share) * 100) / 100)}` }
    : { tone: "owe", text: `you owe ${money(share)}` }
}

// The first bill lands the moment the page arrives, then one more every beat until all five are down;
// back to an empty pile when the page leaves.
function usePile(on: boolean) {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    if (!on || reduceMotion()) return
    let landed = 0
    const id = window.setInterval(() => {
      landed += 1
      setTicks(landed)
      if (landed >= BILLS - 1) window.clearInterval(id)
    }, STACK_EVERY)
    return () => {
      window.clearInterval(id)
      setTicks(0)
    }
  }, [on])
  if (!on) return 0
  return reduceMotion() ? BILLS - 1 : ticks
}

// Glides from the value it shows to each new `to` at an even speed, so a stat can step up again before it has settled.
function useTween(to: number, ms = STACK_EVERY) {
  const [value, setValue] = useState(to)
  const shown = useRef(to)
  useEffect(() => {
    const from = shown.current
    if (from === to) return
    if (reduceMotion()) {
      shown.current = to
      const id = requestAnimationFrame(() => setValue(to))
      return () => cancelAnimationFrame(id)
    }
    let frame = 0
    const begin = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - begin) / ms, 1)
      shown.current = from + (to - from) * t
      setValue(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to, ms])
  return value
}

// A stat that steps up with each landed bill and flashes blue as it changes, so the cause is read with the effect.
function Stat({ value, format = (n: number) => String(Math.round(n)), beat }: { value: number; format?: (n: number) => string; beat: number }) {
  const shown = useTween(value)
  return (
    <b key={beat} className={beat > 0 ? "onb-bump" : undefined}>
      {format(shown)}
    </b>
  )
}

// The five bills that land, oldest first; before them the card shows the trip as it was.
const landing = initialExpenses.slice(0, BILLS)
const before = {
  total: groupTotal - landing.reduce((sum, item) => sum + item.amount, 0),
  count: initialExpenses.length - BILLS,
  paid: youPaid - landing.filter((item) => item.paidBy === "you").reduce((sum, item) => sum + item.amount, 0),
}
const euros = (n: number) => money(Math.round(n))

// The balance card as it is in the app and a pile of bills: each bill that lands updates the card above it — the
// balance steps up, the count ticks, the group total and what you paid add the bill — and pushes the pile down.
function ExpensesVisual({ on }: { on: boolean }) {
  const ticks = usePile(on)
  const landed = on ? ticks + 1 : 0
  const down = landing.slice(0, landed)
  const total = before.total + down.reduce((sum, item) => sum + item.amount, 0)
  const paid = before.paid + down.filter((item) => item.paidBy === "you").reduce((sum, item) => sum + item.amount, 0)
  const last = down[down.length - 1]
  const rows = Array.from({ length: landed }, (_, depth) => ({ depth, item: landing[landed - 1 - depth] }))
  return (
    <div className="onb-exp">
      <div className="owed">
        <p className="owed-by">
          <AvatarStack ids={["ben", "menta"]} size={20} />
          You are owed by 2 people
        </p>
        <div className="owed-row">
          <strong>
            <Stat value={(235 * landed) / BILLS} format={euros} beat={landed} />
          </strong>
          <span className="onb-balances">
            Balances <IconChevron />
          </span>
        </div>
        <div className="stats">
          <span>
            <small>Group total</small>
            <Stat value={total} format={euros} beat={landed} />
          </span>
          <span>
            <small>Expenses</small>
            <Stat value={before.count + landed} beat={landed} />
          </span>
          <span>
            <small>You paid</small>
            <Stat value={paid} format={euros} beat={last?.paidBy === "you" ? landed : 0} />
          </span>
        </div>
      </div>
      <div className="onb-pile" aria-hidden="true">
        {rows.map(({ depth, item }) => {
          const stake = stakeOf(item)
          return (
            <div key={item.id} className="onb-pile-card" data-depth={depth} style={{ "--k": depth } as CSSProperties}>
              <div className="expense-row">
                <div className="expense-main">
                  <span>{item.title}</span>
                  <small>
                    {item.paidBy === "you" ? "You" : people[item.paidBy]?.name.split(" ")[0]} paid · split {item.split} ways
                  </small>
                </div>
                <div className="expense-amt">
                  <strong>{money(item.amount)}</strong>
                  <em className={stake.tone}>{stake.text}</em>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

maplibregl.setWorkerUrl(workerUrl)

// The Passport's globe telling the route as a journey: a city pops in, the line travels its arc to the next, and so on.
const REVEAL_START = 0.2
// Quicker than the Passport tab's and at an even speed, so the onboarding's journey reads as one smooth sweep.
const PACE = { pace: 0.7, linear: true }
const times = dotTimes(globePlaces.length, PACE)
const revealAt = (index: number) => REVEAL_START + times[index] / 1000
const REVEAL_END = REVEAL_START + revealMs(globePlaces.length, PACE) / 1000
const dealt = ["amsterdam", "munich", "porto", "paris", "lisbon"].map((id) => ({ stamp: stamp(id), at: revealAt(globePlaces.findIndex((item) => item.id === id)) }))
const places = globePlaces.map((item) => ({ coord: item.coord }))
const route = passportArcs.map((coordinates) => ({ coordinates }))

// Mounted only once the page is near, so the launch doesn't pay for a second map; kept alive after that.
function OnbGlobe({ on, onStart }: { on: boolean; onStart: (started: boolean) => void }) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!node.current) return
    const map = new maplibregl.Map({
      container: node.current,
      style: STYLE_URL,
      // Zoomed out far enough that the sphere's edge shows (diameter ≈ worldSize / π ≈ 340px), so it reads as the globe.
      center: [2, 40],
      zoom: Math.log2((340 * Math.PI) / 512),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    })
    mapRef.current = map
    map.on("load", () => {
      map.setProjection({ type: "globe" })
      applyPalette(map, daylight)
      map.addSource("onb-passport", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      map.addLayer({
        id: "onb-arcs",
        type: "line",
        source: "onb-passport",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#2b59f0", "line-width": 3, "line-opacity": 0.45 },
        layout: { "line-cap": "round", "line-join": "round" },
      })
      map.addLayer({
        id: "onb-dots",
        type: "circle",
        source: "onb-passport",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#2b59f0",
          "circle-stroke-color": "#fff",
          "circle-radius": ["*", 6, ["get", "s"]],
          "circle-stroke-width": ["*", 2, ["min", 1, ["get", "s"]]],
        },
      })
      setReady(true)
    })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(node.current)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Play the journey each time the page comes on; clear it when the page leaves so it plays again next time.
  useEffect(() => {
    const map = mapRef.current
    if (!on || !ready || !map) return
    const stop = playRoute(map.getSource("onb-passport") as maplibregl.GeoJSONSource, places, route, REVEAL_START * 1000, PACE)
    onStart(true)
    return () => {
      stop(true)
      onStart(false)
    }
  }, [on, ready, onStart])

  return <div ref={node} className="onb-globe" />
}

// The Passport globe lights up city by city, each trip's stamp deals in as its city appears, and the totals count up
// alongside; the globe fades out at the bottom into the stamps.
function PassportVisual({ on, near }: { on: boolean; near: boolean }) {
  // Everything below runs off the moment the globe's route starts, not the moment the page shows: the map may still be
  // loading when the page arrives, and the stamps and totals have to move with the lines.
  const [started, setStarted] = useState(false)
  const going = on && started
  const span = (REVEAL_END - REVEAL_START) * 1000
  const countries = useCount(4, going, span, REVEAL_START * 1000, linear)
  const cities = useCount(7, going, span, REVEAL_START * 1000, linear)
  const nights = useCount(21, going, span, REVEAL_START * 1000, linear)
  return (
    <div className={going ? "onb-pass dealing" : "onb-pass"}>
      <div className="onb-globe-wrap" aria-hidden="true">
        {near && <OnbGlobe on={on} onStart={setStarted} />}
      </div>
      <div className="onb-fan">
        {dealt.map(({ stamp: item, at }, index) => (
          <div key={item.id} className="onb-fan-stamp" style={{ "--i": index - (dealt.length - 1) / 2, "--d": `${at + 0.05}s` } as CSSProperties}>
            <StampArt stamp={item} />
          </div>
        ))}
      </div>
      <dl className="pass-numbers">
        <div>
          <dd>{Math.round(countries)}</dd>
          <dt>Countries</dt>
        </div>
        <div>
          <dd>{Math.round(cities)}</dd>
          <dt>Cities</dt>
        </div>
        <div>
          <dd>{Math.round(nights)}</dd>
          <dt>Nights away</dt>
        </div>
      </dl>
    </div>
  )
}
