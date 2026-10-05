import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type ReactNode } from "react"
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import { globePlaces, initialExpenses, passportArcs, passportStamps, people, tripNights, trips, tuesdayPoll } from "../data"
import { STYLE_URL, applyPalette, daylight } from "../mapStyle"
import { DOT_MS, dotTimes, playRoute } from "../globeReveal"
import { dayStops, place } from "../state"
import { StampArt } from "./Passport"
import { CardWhen } from "./TripSheet"
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
// A finger turns the page past 32px or on a flick quicker than 0.25px/ms. A mouse drag is short and deliberate (the
// press already says "drag"), so it turns past 16px or 0.15px/ms.
const SWIPE = { touch: { px: 32, flick: 0.25 }, mouse: { px: 16, flick: 0.15 } }
// A mouse drag doesn't wait for the release: once it's this far along, the page snaps over while the button is still down.
const MOUSE_SNAP = 40
// A two-finger trackpad swipe turns one page once it has travelled this far sideways; the momentum that follows is
// ignored until the wheel has been quiet for WHEEL_REST.
const WHEEL_PX = 30
const WHEEL_REST = 180
// A press that barely moves and lets go within this is a tap: the right half goes forward, the left half back.
const TAP_MS = 350

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0)
  const [dx, setDx] = useState(0)
  // `trail` keeps the last 100ms of moves, so a release reads the speed the pointer had at the end, not its average.
  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null; trail: { x: number; t: number }[] } | null>(null)
  const wheel = useRef({ sum: 0, spent: false, timer: 0 })
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
    drag.current = { x: event.clientX, y: event.clientY, axis: null, trail: [{ x: event.clientX, t: event.timeStamp }] }
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    // A mouse released outside the window never sends pointerup here; drop the drag once its button is up.
    if (event.pointerType === "mouse" && event.buttons === 0) return cancel()
    const x = event.clientX - start.x
    start.trail.push({ x: event.clientX, t: event.timeStamp })
    while (start.trail.length > 2 && event.timeStamp - start.trail[0].t > 100) start.trail.shift()
    if (!start.axis) {
      if (Math.abs(x) < 8 && Math.abs(event.clientY - start.y) < 8) return
      // The pages never scroll, so only a clearly vertical drag is left alone; anything diagonal pages.
      start.axis = Math.abs(event.clientY - start.y) > Math.abs(x) * 2 ? "y" : "x"
      if (start.axis === "x") event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (start.axis !== "x") return
    const target = x < 0 ? page + 1 : page - 1
    if (event.pointerType === "mouse" && Math.abs(x) > MOUSE_SNAP && target >= 0 && target < PAGES.length) {
      drag.current = null
      setDx(0)
      return go(target)
    }
    // The first page is where the story starts, so it doesn't pull back past its edge at all; the last one rubber-bands.
    if (page === 0 && x > 0) return setDx(0)
    setDx(last && x < 0 ? x * 0.3 : x)
  }
  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    drag.current = null
    if (start && !start.axis && event.timeStamp - start.trail[0].t < TAP_MS) {
      const box = event.currentTarget.getBoundingClientRect()
      // The last page's way forward is its button, so a tap there doesn't end the onboarding by accident.
      if (event.clientX >= box.left + box.width / 2) {
        if (!last) go(page + 1)
      } else go(page - 1)
      return
    }
    if (!start || start.axis !== "x") return setDx(0)
    const x = event.clientX - start.x
    const from = start.trail[0]
    const speed = (event.clientX - from.x) / Math.max(event.timeStamp - from.t, 1)
    const { px, flick } = event.pointerType === "mouse" ? SWIPE.mouse : SWIPE.touch
    // A flick decides the direction, else the distance does; a flick back against a drag calls it off.
    const flung = Math.abs(speed) > flick ? Math.sign(speed) : 0
    const pulled = Math.abs(x) > px ? Math.sign(x) : 0
    const dir = flung && pulled && flung !== pulled ? 0 : flung || pulled
    if (dir) go(page - dir)
    setDx(0)
  }
  function scroll(event: ReactWheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    const state = wheel.current
    window.clearTimeout(state.timer)
    state.timer = window.setTimeout(() => Object.assign(state, { sum: 0, spent: false }), WHEEL_REST)
    if (state.spent) return
    state.sum += event.deltaX
    if (Math.abs(state.sum) < WHEEL_PX) return
    state.spent = true
    go(state.sum > 0 ? page + 1 : page - 1)
  }
  // An interrupted drag (the browser took the pointer, or it was lost) settles back on the page it was on; its
  // coordinates aren't a real release, so they must not turn the page.
  function cancel() {
    drag.current = null
    setDx(0)
  }

  return (
    <div className="onb" data-page={PAGES[page]} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onDragStart={(event) => event.preventDefault()} onWheel={scroll}>
      <StatusBar light={page === 0} island={false} />
      <button type="button" className={last ? "onb-skip glass away" : "onb-skip glass"} onClick={onDone} tabIndex={last ? -1 : 0}>
        Skip
      </button>
      <div className={dx ? "onb-track dragging" : "onb-track"} style={{ transform: `translateX(calc(${-page * 100}% + ${dx}px))` }}>
        <Page on={page === 0} kind="splash" visual={<Splash on={page === 0} />} title={"Plan the trip.\nShare the moments."} body="Your trips, your friends and every memory, in one place." />
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
        <button type="button" className="onb-next glass" onClick={() => (last ? onDone() : go(page + 1))}>
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

// The idle sway, as the two poses it rocks between every 7s (after the 0.9s entrance), and the sheen that rides with it.
const SWAY = { delay: 0.9, period: 7 }
const POSE_A = { ry: -16, rx: 6, rz: -6, px: 18, py: 22, bx: 42, by: 40 }
const POSE_B = { ry: 16, rx: -5, rz: -2, px: 82, py: 70, bx: 58, by: 58 }
const POSE_STILL = { ry: -8, rx: 3, rz: -6, px: 30, py: 30, bx: 45, by: 44 }
type Pose = typeof POSE_A
const mixPose = (a: Pose, b: Pose, t: number) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key as keyof Pose] + (b[key as keyof Pose] - a[key as keyof Pose]) * t])) as Pose

// The app icon's stamp, huge, under the same laminate as the passport stamps. Built like the Passport's StampStage: a
// perspective stage and one card, the only thing turned in 3D, at its real size. It sways on its own; grab it and it
// follows the finger, the sheen sliding with it, then eases back into the sway on release. Sway, tilt and sheen are
// blended here each frame into the card's one transform and its sheen variables, so nothing in CSS competes with them.
function Splash({ on }: { on: boolean }) {
  const card = useRef<HTMLDivElement>(null)
  // The pointer holding the stamp (a second finger doesn't take it over), and where the finger wants it.
  const start = useRef<{ id: number; x: number; y: number } | null>(null)
  const hold = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [held, setHeld] = useState(false)
  const clamp = (value: number) => Math.max(-TILT_MAX, Math.min(TILT_MAX, value))
  function follow(event: ReactPointerEvent<HTMLDivElement>) {
    if (start.current?.id !== event.pointerId) return
    // A release the stamp never heard (outside the window or the phone frame) shows up as a move with nothing pressed.
    if (event.buttons === 0) return release()
    const box = event.currentTarget.getBoundingClientRect()
    hold.current = {
      y: clamp((event.clientX - start.current.x) * 0.35),
      x: clamp(-(event.clientY - start.current.y) * 0.35),
      px: Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
      py: Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
    }
  }
  function release() {
    start.current = null
    hold.current = null
    setHeld(false)
  }
  // Losing the window mid-drag (switching apps, a dialog) never sends the release either.
  useEffect(() => {
    window.addEventListener("blur", release)
    return () => window.removeEventListener("blur", release)
  }, [])

  useEffect(() => {
    const el = card.current
    if (!el || !on) return
    const still = reduceMotion()
    let frame = 0
    let last = performance.now()
    let sway = 0 // seconds of sway played; it stands still while the stamp is held
    const tilt = { x: 0, y: 0 }
    let grip = 0 // 0 = the sway's sheen, 1 = the finger's
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const target = hold.current
      if (!target) sway += dt
      // Ease towards the target: close behind the finger while held, a soft ~0.7s settle once let go.
      const ease = (tau: number) => (still ? 1 : 1 - Math.exp(-dt / tau))
      const k = ease(target ? 0.03 : 0.16)
      tilt.x += ((target?.x ?? 0) - tilt.x) * k
      tilt.y += ((target?.y ?? 0) - tilt.y) * k
      grip += ((target ? 1 : 0) - grip) * ease(target ? 0.05 : 0.15)
      const phase = Math.max(0, sway - SWAY.delay) / SWAY.period
      const pose = still ? POSE_STILL : mixPose(POSE_A, POSE_B, 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI))
      const px = pose.px + ((target?.px ?? pose.px) - pose.px) * grip
      const py = pose.py + ((target?.py ?? pose.py) - pose.py) * grip
      el.style.transform = `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateY(${pose.ry}deg) rotateX(${pose.rx}deg) rotate(${pose.rz}deg)`
      el.style.setProperty("--pointer-x", `${px}%`)
      el.style.setProperty("--pointer-y", `${py}%`)
      el.style.setProperty("--background-x", `${pose.bx + (37 + px * 0.26 - pose.bx) * grip}%`)
      el.style.setProperty("--background-y", `${pose.by + (33 + py * 0.34 - pose.by) * grip}%`)
      el.style.setProperty("--card-opacity", String((still ? 0.6 : 0.9) + 0.1 * grip))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [on])

  return (
    <>
      <img className="onb-sunrise" src="/assets/brand/icon-sunrise.svg" alt="" />
      <div
        className={held ? "onb-logo-in grabbed" : "onb-logo-in"}
        data-onb-tilt
        onPointerDown={(event) => {
          if (start.current) return
          event.currentTarget.setPointerCapture(event.pointerId)
          start.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
          setHeld(true)
          follow(event)
        }}
        onPointerMove={follow}
        onPointerUp={(event) => event.pointerId === start.current?.id && release()}
        onPointerCancel={(event) => event.pointerId === start.current?.id && release()}
        // However the capture ends (released, cancelled, or dropped by the browser), the stamp goes back to its sway.
        onLostPointerCapture={(event) => event.pointerId === start.current?.id && release()}
      >
        <div ref={card} className="app-icon-stamp onb-logo">
          <img className="app-icon-paper" src="/assets/brand/icon-stamp.svg" alt="" draggable={false} />
          <img className="app-icon-art" src="/assets/brand/icon-landscape.svg" alt="" draggable={false} />
          <b>TripUp</b>
          <span className="stamp-holo stamp-holo-shine" aria-hidden="true" />
          <span className="stamp-holo stamp-holo-glare" aria-hidden="true" />
          <span className="stamp-holo stamp-holo-paper" aria-hidden="true" />
        </div>
      </div>
    </>
  )
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches

const nowStop = dayStops("tue").find((item) => item.tone === "now")!
const pollTotal = tuesdayPoll.options.reduce((sum, option) => sum + option.votes.length, 0)
const pollOptions = tuesdayPoll.options.slice(0, 2)

// The poll is played as a vote: it arrives unanswered, the first option is tapped and ticked, then it turns into the
// results with the bars filling. Seconds from the page arriving.
// The options are in by about 2.9s; the tap follows almost straight away, just long enough to see the poll unanswered.
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

const FUTURE_ROUTE = "M168 132 C 204 124, 226 146, 246 160 S 284 176, 306 168"

// The real itinerary pieces: the map above, and in the sheet today's activity and the dinner poll with two options.
function TripsVisual({ on }: { on: boolean }) {
  const phase = usePollPhase(on)
  return (
    <div className="onb-trip">
      <div className="onb-map">
        <img className="onb-map-bg" src="/assets/home/map-shot.png" alt="" draggable={false} />
        <svg className="onb-route" viewBox="0 0 330 210" aria-hidden="true">
          <path className="onb-route-past" pathLength={1} d="M78 18 C 92 52, 70 84, 104 110 S 140 140, 168 132" />
          {/* The future route is dashed, so it can't draw itself with its own dash offset like the past one: a solid copy
              draws in a mask over it instead, while the dashes keep marching underneath. */}
          <mask id="onb-future-reveal" maskUnits="userSpaceOnUse" x="-20" y="-20" width="370" height="250">
            <path className="onb-route-reveal" pathLength={1} d={FUTURE_ROUTE} />
          </mask>
          <path className="onb-route-future" mask="url(#onb-future-reveal)" d={FUTURE_ROUTE} />
          <circle className="onb-stop past" cx="78" cy="18" r="7.15" style={{ "--d": "0.2s" } as CSSProperties} />
          <circle className="onb-stop past" cx="104" cy="110" r="7.15" style={{ "--d": "0.6s" } as CSSProperties} />
          <circle className="onb-stop future" cx="246" cy="160" r="7.12" style={{ "--d": "1.65s" } as CSSProperties} />
          <circle className="onb-stop future" cx="306" cy="168" r="7.12" style={{ "--d": "2.05s" } as CSSProperties} />
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
          <div className="card-meta">
            <CardWhen time={nowStop.time} now />
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
// Four bills land, one every beat, then the pile rests. Each move lasts the whole beat (index.css), so the pile and the
// numbers flow from one bill into the next without stopping.
const BILLS = 4
const STACK_EVERY = 650

function stakeOf(item: (typeof initialExpenses)[number]) {
  const share = Math.round((item.amount / item.split) * 100) / 100
  return item.paidBy === "you"
    ? { tone: "lent", text: `you lent ${money(Math.round((item.amount - share) * 100) / 100)}` }
    : { tone: "owe", text: `you owe ${money(share)}` }
}

// The first bill lands the moment the page arrives, then one more every beat until all four are down;
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

// The four bills that land, oldest first; before them the card shows the trip as it was.
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

// The Passport's globe telling the route as a journey, one beat per city, the line and the dots at an even, linear
// speed. Each city hands over its stamp the way the photo button hands out photos: as the line reaches the city its
// dot pops and the stamp springs out of that dot into its place in the fan, and the totals count up as it flies.
//   0ms     the line reaches the city and its dot pops
//   120ms   the dot is out: the stamp springs out of it and the totals start to count; the line leaves for the next
//           city, reaching it 376ms after it got here
//   540ms   the stamp settles into the fan, and the totals with it
// The flight outlasts the beat, so each stamp is still settling as the next one springs out.
// The route waits a beat before the first city, so the page has slid in before the first stamp flies.
const DEAL_S = 0.42
const REVEAL_START = 0.45
// The Passport tab's reveal, a fifth quicker (dots 120ms, lines 256ms), and linear.
const PACE = { pace: 0.8, linear: true }
const times = dotTimes(globePlaces.length, PACE)
// When each city's dot starts to pop, in seconds from the moment the route starts.
const arriveAt = (index: number) => REVEAL_START + times[index] / 1000
// When its stamp springs out: once the dot has popped, which also gives the map the moment it takes to draw the dot.
const leaveAt = (index: number) => arriveAt(index) + (DOT_MS * PACE.pace) / 1000
const dealt = globePlaces.map((item, index) => ({ stamp: item, at: leaveAt(index) }))

// The Passport's totals as they stand once each city is on the globe. A trip's nights, and any of its cities the globe
// doesn't show (Rotterdam), are counted with the trip's first city on the globe.
const onGlobe = new Set(globePlaces.map((item) => item.id))
const tally = (() => {
  const countries = new Set<string>()
  let cities = 0
  let nights = 0
  return globePlaces.map((item) => {
    const trip = trips.find((entry) => entry.stampIds.includes(item.id))
    const first = trip?.stampIds.find((id) => onGlobe.has(id)) === item.id
    const added = trip && first ? trip.stampIds.filter((id) => id === item.id || !onGlobe.has(id)) : [item.id]
    for (const id of added) countries.add(passportStamps.find((entry) => entry.id === id)!.country)
    cities += added.length
    if (trip && first) nights += tripNights[trip.id] ?? 0
    return { countries: countries.size, cities, nights }
  })
})()
type Totals = (typeof tally)[number]
const zero: Totals = { countries: 0, cities: 0, nights: 0 }

const KEYS = ["countries", "cities", "nights"] as const
const LABELS = { countries: "Countries", cities: "Cities", nights: "Nights away" }
type Beats = Record<(typeof KEYS)[number], number>
const still: Beats = { countries: 0, cities: 0, nights: 0 }

// The totals counted on the globe's clock: each city's step counts up evenly over its stamp's deal, timed from
// `start`, the moment the route started. `beats` counts the steps each total has taken so far, so a total can flash each time it
// changes. Everything shows at once when motion is reduced.
function useTally(start: number | null) {
  const going = start !== null
  const [state, setState] = useState({ totals: zero, beats: still })
  useEffect(() => {
    if (!going || reduceMotion()) return
    let frame = 0
    const tick = (now: number) => {
      const elapsed = (now - start!) / 1000
      const totals = { ...zero }
      const beats = { ...still }
      tally.forEach((step, index) => {
        const before = tally[index - 1] ?? zero
        const from = leaveAt(index)
        if (elapsed < from) return
        const t = Math.min((elapsed - from) / DEAL_S, 1)
        for (const key of KEYS) {
          totals[key] += (step[key] - before[key]) * t
          if (step[key] > before[key]) beats[key] += 1
        }
      })
      setState((last) => (KEYS.every((key) => last.totals[key] === totals[key] && last.beats[key] === beats[key]) ? last : { totals, beats }))
      if (elapsed < leaveAt(tally.length - 1) + DEAL_S) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setState({ totals: zero, beats: still })
    }
  }, [going, start])
  if (!going) return { totals: zero, beats: still }
  return reduceMotion() ? { totals: tally[tally.length - 1], beats: still } : state
}
const places = globePlaces.map((item) => ({ coord: item.coord }))
const route = passportArcs.map((coordinates) => ({ coordinates }))

// Mounted only once the page is near, so the launch doesn't pay for a second map; kept alive after that.
// Where each city's dot is on screen, in client pixels.
type Locate = () => { x: number; y: number }[]

// `onStart` hears the moment (performance.now()) the route starts, with a way to find the cities' dots on screen, and
// null when it is cleared.
function OnbGlobe({ on, onStart }: { on: boolean; onStart: (start: { at: number; locate: Locate } | null) => void }) {
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
    const at = performance.now()
    const stop = playRoute(map.getSource("onb-passport") as maplibregl.GeoJSONSource, places, route, REVEAL_START * 1000, PACE)
    const locate: Locate = () => {
      const box = map.getContainer().getBoundingClientRect()
      return places.map(({ coord }) => {
        const point = map.project(coord)
        return { x: box.left + point.x, y: box.top + point.y }
      })
    }
    onStart({ at, locate })
    return () => {
      stop(true)
      onStart(null)
    }
  }, [on, ready, onStart])

  return <div ref={node} className="onb-globe" />
}

// The Passport globe lights up city by city; as each city appears its stamp deals in and the totals count up what it
// adds; the globe fades out at the bottom into the stamps.
// The page track's slide (0.5s in index.css): a page leaving stays as it was until it is out of view.
const SLIDE_MS = 500

// True while `on`, and for `ms` after it turns off.
function useLinger(on: boolean, ms: number) {
  const [gone, setGone] = useState(!on)
  if (on && gone) setGone(false)
  useEffect(() => {
    if (on) return
    const id = window.setTimeout(() => setGone(true), ms)
    return () => window.clearTimeout(id)
  }, [on, ms])
  return on || !gone
}

function PassportVisual({ on: shown, near }: { on: boolean; near: boolean }) {
  // Swiping away, the journey stays told while the page slides out, then resets out of sight to play again next time.
  const on = useLinger(shown, SLIDE_MS)
  // Everything below runs on the globe's clock, from the moment its route starts, not the moment the page shows or
  // React gets round to it: the map may still be loading when the page arrives, and the stamps and totals have to move
  // with the lines.
  const [route, setRoute] = useState<{ at: number; locate: Locate } | null>(null)
  const start = on && route ? route.at : null
  const { totals, beats } = useTally(start)
  const node = useRef<HTMLDivElement>(null)
  // The stamps fly once each knows the way from its city's dot to its place in the fan.
  const [aimed, setAimed] = useState(false)
  if (start === null && aimed) setAimed(false)
  useLayoutEffect(() => {
    if (start === null || aimed || !route || !node.current) return
    const dots = route.locate()
    node.current.querySelectorAll<HTMLElement>(".onb-fan-fly").forEach((fly, index) => {
      // Measured at rest (the flight hasn't started), so this is where the stamp ends up, fan angle and all. The flight
      // runs inside the fan's rotation, so the way back to the dot is turned into the stamp's own frame.
      const box = (fly.firstElementChild as HTMLElement).getBoundingClientRect()
      const angle = ((index - (dealt.length - 1) / 2) * 7.5 * Math.PI) / 180
      const dx = dots[index].x - (box.left + box.width / 2)
      const dy = dots[index].y - (box.top + box.height / 2)
      fly.style.setProperty("--dx", `${dx * Math.cos(angle) + dy * Math.sin(angle)}px`)
      fly.style.setProperty("--dy", `${-dx * Math.sin(angle) + dy * Math.cos(angle)}px`)
      fly.style.setProperty("--unfan", `${-angle}rad`)
    })
    setAimed(true)
  }, [start, aimed, route])
  const dealing = start !== null && aimed
  // The stamps' delays count from the route's start, so however late the class lands they are caught up.
  useLayoutEffect(() => {
    if (dealing && start !== null) node.current?.style.setProperty("--late", `${(performance.now() - start) / 1000}s`)
  }, [dealing, start])
  return (
    <div ref={node} className={["onb-pass", on && "live", dealing && "dealing"].filter(Boolean).join(" ")}>
      <div className="onb-globe-wrap" aria-hidden="true">
        {near && <OnbGlobe on={on} onStart={setRoute} />}
      </div>
      <div className="onb-fan">
        {dealt.map(({ stamp: item, at }, index) => (
          <div key={item.id} className="onb-fan-stamp" style={{ "--i": index - (dealt.length - 1) / 2, "--d": `${at}s` } as CSSProperties}>
            <div className="onb-fan-fly">
              <StampArt stamp={item} />
            </div>
          </div>
        ))}
      </div>
      <dl className="pass-numbers">
        {KEYS.map((key) => (
          <div key={key}>
            <dd key={beats[key]} className={beats[key] ? "onb-bump" : undefined}>
              {Math.round(totals[key])}
            </dd>
            <dt>{LABELS[key]}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
