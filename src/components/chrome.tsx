import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { tripDays } from "../data"
import { TODAY, dayStops, person, place, useStore } from "../state"
import { IconBack } from "./icons"

/* ─────────────────────────────────────────────────────────
 * DYNAMIC ISLAND · live activity for the trip in progress
 *
 *    0ms   plain island
 *  700ms   grows to compact: next plan's photo left, its start time right
 *    tap   springs open into the card (Up next, plan, day progress)
 *    tap   on the card opens the trip; a tap anywhere else closes it
 * ───────────────────────────────────────────────────────── */
const ISLAND_APPEAR_MS = 700

type NextUp = { title: string; detail: string; time: string; meta: string; photo?: string }

const titleCase = (text: string) => text[0].toUpperCase() + text.slice(1)

// What comes after the stop happening now, read from the same itinerary and poll the trip drawer shows.
function useNextUp(): NextUp | null {
  const { state } = useStore()
  const poll = state.pollByDay[TODAY]
  if (poll && poll.options.length > 0) {
    const most = Math.max(...poll.options.map((option) => option.votes.length))
    const top = poll.options.find((option) => option.votes.length === most) ?? poll.options[0]
    const info = place(top.id)
    const name = info?.name ?? top.name ?? "Option"
    const label = poll.status ? titleCase(poll.status) : "Plan"
    if (poll.decided) return { title: name, detail: label, time: poll.from, meta: `until ${poll.to}`, photo: info?.photo }
    const ballots = new Set(poll.options.flatMap((option) => option.votes)).size
    return { title: `${label} poll`, detail: `${name} leading`, time: poll.from, meta: `${ballots}/${state.members.length + 1} voted`, photo: info?.photo }
  }
  const list = dayStops(TODAY)
  const next = list[list.findIndex((stop) => stop.tone === "now") + 1]
  if (!next) return null
  const [from, to] = next.time.split("–")
  return { title: next.title, detail: titleCase(next.status), time: from, meta: `until ${to}`, photo: next.title === "Hotel Da Baixa" ? "/assets/hotel-baixa.png" : undefined }
}

function LiveActivity({ onOpen }: { onOpen?: () => void }) {
  const [stage, setStage] = useState<"idle" | "compact" | "expanded">("idle")
  const island = useRef<HTMLDivElement>(null)
  const next = useNextUp()
  const days = tripDays("lisbon")
  const today = days.findIndex((day) => day.progress > 0 && day.progress < 1)
  const left = days.length - today - 1

  useEffect(() => {
    const timer = window.setTimeout(() => setStage("compact"), ISLAND_APPEAR_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (stage !== "expanded") return
    const close = (event: PointerEvent) => {
      if (!island.current?.contains(event.target as Node)) setStage("compact")
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [stage])

  if (!next) return <span className="island" />
  const thumb = next.photo ? <img src={next.photo} alt="" /> : <i className="island-thumb" />
  return (
    <div ref={island} className="island" data-stage={stage}>
      <button type="button" className="island-compact" aria-label={`Up next at ${next.time}: ${next.title}`} aria-expanded={stage === "expanded"} tabIndex={stage === "compact" ? 0 : -1} onClick={() => setStage("expanded")}>
        {thumb}
        <b>{next.time}</b>
      </button>
      <button
        type="button"
        className="island-expanded"
        tabIndex={stage === "expanded" ? 0 : -1}
        onClick={() => {
          setStage("compact")
          onOpen?.()
        }}
      >
        <span className="island-row">
          {thumb}
          <span className="island-text">
            <small>Up next</small>
            <strong>{next.title}</strong>
            <em>{next.detail}</em>
          </span>
          <span className="island-when">
            <strong>{next.time}</strong>
            <em>{next.meta}</em>
          </span>
        </span>
        <span className="island-progress">
          <span className="island-days">
            <span>
              Day {today + 1} of {days.length}
            </span>
            <span>{left === 1 ? "1 day left" : `${left} days left`}</span>
          </span>
          <DaySegments fills={days.map((day) => day.progress)} />
        </span>
      </button>
    </div>
  )
}

export function StatusBar({ light = false, onOpenTrip }: { light?: boolean; onOpenTrip?: () => void }) {
  return (
    <div className={light ? "status light" : "status"}>
      <span className="time">9:41</span>
      <LiveActivity onOpen={onOpenTrip} />
      <span className="signals" aria-hidden="true">
        <svg width="17" height="12" viewBox="0 0 17 12">
          <rect x="0" y="7" width="3" height="5" rx="0.6" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.6" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.6" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.6" fill="currentColor" />
        </svg>
        <svg width="15" height="12" viewBox="0 0 15 12">
          <path d="M7.5 2.2c2.4 0 4.6.9 6.3 2.4l-1.2 1.3A7 7 0 0 0 7.5 3.8 7 7 0 0 0 2.4 5.9L1.2 4.6A9 9 0 0 1 7.5 2.2Z" fill="currentColor" />
          <path d="M7.5 5.6c1.4 0 2.7.5 3.7 1.4L10 8.2A3.6 3.6 0 0 0 7.5 7.2 3.6 3.6 0 0 0 5 8.2L3.8 7A5.4 5.4 0 0 1 7.5 5.6Z" fill="currentColor" />
          <circle cx="7.5" cy="10.2" r="1.3" fill="currentColor" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.2" stroke="currentColor" fill="none" />
          <rect x="2" y="2" width="16" height="8" rx="1.2" fill="currentColor" />
          <path d="M23 4.2v3.6c.8-.3 1.2-1 1.2-1.8s-.4-1.5-1.2-1.8Z" fill="currentColor" />
        </svg>
      </span>
    </div>
  )
}

export function DaySegments({ fills }: { fills: number[] }) {
  return (
    <span className="segments" aria-hidden="true">
      {fills.map((fill, index) => (
        <i key={index}>
          <b style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
        </i>
      ))}
    </span>
  )
}

type Surface = "white" | "grey"

function Stack({ photos, total, className, style, surface }: { photos: { src: string; alt: string }[]; total: number; className: string; style?: CSSProperties; surface: Surface }) {
  if (photos.length === 0) return null
  const crowded = total > 3
  const shown = crowded ? photos.slice(0, 2) : photos.slice(0, 3)
  return (
    <span className={className} style={style}>
      {shown.map((photo, index) => (
        <img key={`${photo.src}-${index}`} src={photo.src} alt={photo.alt} />
      ))}
      {crowded && <span className={surface === "grey" ? "faces-more on-grey" : "faces-more"}>+{total - 2}</span>}
    </span>
  )
}

const photosOf = (ids: string[]) =>
  ids.flatMap((id) => {
    const item = person(id)
    return item ? [{ src: item.photo, alt: item.name }] : []
  })

export function AvatarStack({ ids, extra = 0, size = 26, surface = "white" }: { ids: string[]; extra?: number; size?: number; surface?: Surface }) {
  const photos = photosOf(ids)
  return <Stack photos={photos} total={photos.length + extra} className="faces" style={{ "--face": `${size}px` } as CSSProperties} surface={surface} />
}

export function PhotoStack({ kind, ids, extra = 0, surface = "white" }: { kind: "header" | "card" | "vote"; ids: string[]; extra?: number; surface?: Surface }) {
  const photos = photosOf(ids)
  return <Stack photos={photos} total={photos.length + extra} className={`faces faces-${kind}`} surface={surface} />
}

export function PictureStack({ srcs, total, size = 28 }: { srcs: string[]; total: number; size?: number }) {
  return <Stack photos={srcs.map((src) => ({ src, alt: "" }))} total={total} className="faces" style={{ "--face": `${size}px` } as CSSProperties} surface="white" />
}

export function Face({ id, size = 36 }: { id: string; size?: number }) {
  return <img className="face" src={person(id)?.photo} alt="" width={size} height={size} />
}

type Tab = "trips" | "friends" | "passport"

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "trips", label: "Trips", icon: "tab-trips" },
  { id: "friends", label: "Friends", icon: "tab-friends" },
  { id: "passport", label: "Passport", icon: "passport" },
]

type Spring = { x: number; v: number; to: number }

function step(spring: Spring, dt: number, response: number, damping: number) {
  const stiffness = (2 * Math.PI / response) ** 2
  const friction = (4 * Math.PI * damping) / response
  spring.v += (-stiffness * (spring.x - spring.to) - friction * spring.v) * dt
  spring.x += spring.v * dt
}

const settled = (spring: Spring) => Math.abs(spring.x - spring.to) < 0.01 && Math.abs(spring.v) < 0.01

function rubberband(value: number, min: number, max: number) {
  const band = (over: number) => (over * 60 * 0.55) / (60 + 0.55 * over)
  if (value < min) return min - band(min - value)
  if (value > max) return max + band(value - max)
  return value
}

function useLens(index: number, onCommit: (index: number) => void) {
  const pill = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLSpanElement>(null)
  const motion = useRef({
    x: { x: 0, v: 0, to: 0 } as Spring,
    lift: { x: 0, v: 0, to: 0 } as Spring,
    slots: [] as { left: number; width: number }[],
    frame: 0,
    last: 0,
    placed: false,
  })

  const paint = useCallback(() => {
    const { x, lift, slots } = motion.current
    const el = lens.current
    if (!el || !slots.length) return
    const stretch = Math.min(Math.abs(x.v) / 3400, 0.14)
    const grow = Math.max(lift.x, -0.2)
    el.style.width = `${slots[0].width}px`
    el.style.transform = `translateX(${x.x}px) scale(${(1 + 0.16 * grow) * (1 + stretch)}, ${(1 + 0.26 * grow) * (1 - stretch * 0.45)})`
  }, [])

  const run = useCallback(() => {
    const state = motion.current
    if (state.frame) return
    state.last = performance.now()
    const tick = (now: number) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      let dt = Math.min((now - state.last) / 1000, 1 / 30)
      state.last = now
      if (reduce) {
        for (const spring of [state.x, state.lift]) Object.assign(spring, { x: spring.to, v: 0 })
      }
      while (dt > 0) {
        const slice = Math.min(dt, 1 / 240)
        step(state.x, slice, 0.4, 0.74)
        step(state.lift, slice, 0.32, 0.62)
        dt -= slice
      }
      paint()
      if (settled(state.x) && settled(state.lift)) {
        for (const spring of [state.x, state.lift]) Object.assign(spring, { x: spring.to, v: 0 })
        paint()
        state.frame = 0
        return
      }
      state.frame = requestAnimationFrame(tick)
    }
    state.frame = requestAnimationFrame(tick)
  }, [paint])

  useLayoutEffect(() => {
    const node = pill.current
    if (!node) return
    const measure = () => {
      const tabs = [...node.querySelectorAll<HTMLElement>(".tab")]
      motion.current.slots = tabs.map((tab) => ({ left: tab.offsetLeft - 2, width: tab.offsetWidth + 4 }))
    }
    measure()
    const observer = new ResizeObserver(() => {
      measure()
      paint()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [paint])

  useLayoutEffect(() => {
    const state = motion.current
    const slot = state.slots[index]
    if (!slot) return
    state.x.to = slot.left
    if (!state.placed) {
      state.placed = true
      state.x.x = slot.left
      paint()
      return
    }
    run()
  }, [index, paint, run])

  useEffect(() => () => cancelAnimationFrame(motion.current.frame), [])

  const [near, setNear] = useState<number | null>(null)
  const drag = useRef<{ id: number; from: number; moved: boolean } | null>(null)
  const local = (clientX: number) => clientX - (pill.current?.getBoundingClientRect().left ?? 0)
  const nearest = (center: number) => {
    const { slots } = motion.current
    return slots.reduce((best, slot, i) => (Math.abs(slot.left + slot.width / 2 - center) < Math.abs(slots[best].left + slots[best].width / 2 - center) ? i : best), 0)
  }
  const pressed = useRef({ at: 0, timer: 0 })
  const lift = (on: boolean) => {
    const press = pressed.current
    window.clearTimeout(press.timer)
    const apply = () => {
      motion.current.lift.to = on ? 1 : 0
      if (on) motion.current.lift.v += 4
      lens.current?.classList.toggle("lifted", on)
      run()
    }
    if (on) {
      press.at = performance.now()
      apply()
    } else press.timer = window.setTimeout(apply, Math.max(0, 180 - (performance.now() - press.at)))
  }
  useEffect(() => () => window.clearTimeout(pressed.current.timer), [])

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, from: event.clientX, moved: false }
    const target = nearest(local(event.clientX))
    motion.current.x.to = motion.current.slots[target].left
    setNear(target)
    lift(true)
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    if (!start.moved && Math.abs(event.clientX - start.from) < 6) return
    start.moved = true
    const { slots, x } = motion.current
    const center = local(event.clientX)
    x.to = rubberband(center - slots[0].width / 2, slots[0].left, slots[slots.length - 1].left)
    run()
    const target = nearest(center)
    if (target !== near) setNear(target)
  }

  function up(event: ReactPointerEvent<HTMLDivElement>, commit: boolean) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    drag.current = null
    const target = commit ? nearest(local(event.clientX)) : index
    motion.current.x.to = motion.current.slots[target].left
    setNear(null)
    lift(false)
    if (commit) onCommit(target)
  }

  const handlers = {
    onPointerDown: down,
    onPointerMove: move,
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => up(event, true),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => up(event, false),
  }
  return { pill, lens, near, handlers }
}

export function TabBar({ tab, onTab, onAdd }: { tab: Tab; onTab: (tab: Tab) => void; onAdd: () => void }) {
  const index = TABS.findIndex((item) => item.id === tab)
  const { pill, lens, near, handlers } = useLens(index, (target) => onTab(TABS[target].id))
  const shown = near ?? index
  return (
    <div className="tabbar">
      <div ref={pill} className="tab-pill glass" {...handlers}>
        <span ref={lens} className="tab-lens" aria-hidden="true" />
        {TABS.map((item, i) => (
          <TabButton key={item.id} active={i === shown} current={item.id === tab} label={item.label} icon={item.icon} onClick={() => onTab(item.id)} />
        ))}
      </div>
      <button className="search-btn glass" type="button" aria-label="Add trip" onClick={onAdd}>
        <TabIcon icon="tab-plus" />
      </button>
    </div>
  )
}

function TabIcon({ icon }: { icon: string }) {
  return <i className="tab-icon" aria-hidden="true" style={{ "--icon": `url(/assets/icons/${icon}.svg)` } as CSSProperties} />
}

function TabButton({ active, current, label, icon, onClick }: { active: boolean; current: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "tab active" : "tab"} aria-current={current ? "page" : undefined} onClick={(event) => event.detail === 0 && onClick()}>
      <TabIcon icon={icon} />
      <span>{label}</span>
    </button>
  )
}

export function Toast({ text, tone }: { text: string | null; tone: "info" | "error" }) {
  if (!text) return null
  return (
    <div className={tone === "error" ? "toast error" : "toast"} role={tone === "error" ? "alert" : "status"}>
      {tone !== "error" && (
        <span className="toast-icon">
          <img className="asset" src="/assets/icons/toast.svg" alt="" />
        </span>
      )}
      {text}
    </div>
  )
}

export function GlassIcon({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className="glass-icon glass" aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="glass-icon glass" aria-label="Back" onClick={onClick}>
      <IconBack />
    </button>
  )
}

// Toolbar buttons shared by the trip drawer and every full-screen page, so both bars read as one component.
export function ToolIcon({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" className="glass-icon glass" aria-label={label} onClick={onClick}>
      <img className="asset" src={`/assets/icons/${icon}.svg`} alt="" />
    </button>
  )
}

// `primary` marks the action that commits the page (save, create), so it reads as the way forward rather than one more button.
// `idle` disables it until the page has what it needs.
export function ToolAction({ label, icon, idle, primary, onClick }: { label: string; icon?: string; idle?: boolean; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={["add-btn glass", primary && "primary-action", idle && "idle"].filter(Boolean).join(" ")} disabled={idle} onClick={onClick}>
      {icon && <img className="asset" src={`/assets/icons/${icon}.svg`} alt="" />} {label}
    </button>
  )
}

// The one bottom toolbar: the trip drawer passes variant="sheet", full-screen pages use the default.
export function Toolbar({ lead, variant = "page", children }: { lead?: ReactNode; variant?: "sheet" | "page"; children?: ReactNode }) {
  return (
    <footer className={variant === "sheet" ? "sheet-bar" : "page-bar"}>
      {lead}
      <div className="sheet-actions">{children}</div>
    </footer>
  )
}

type SwipeAction = { label: string; icon: ReactNode; tone: "edit" | "delete"; onClick: () => void }

const SWIPE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"
let closeOpenRow: (() => void) | null = null

export function SwipeRow({ actions, children }: { actions: SwipeAction[]; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const tray = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const offset = useRef(0)
  const drag = useRef<{ x: number; y: number; from: number; axis: "x" | "y" | null; lastX: number; lastT: number; speed: number } | null>(null)

  const width = () => tray.current?.offsetWidth ?? 0
  const place = (x: number, animate: boolean) => {
    const el = face.current
    const actionsEl = tray.current
    if (!el || !actionsEl) return
    offset.current = x
    el.style.transition = animate ? `transform 0.32s ${SWIPE_EASE}` : "none"
    actionsEl.style.transition = animate ? `opacity 0.32s ${SWIPE_EASE}` : "none"
    el.style.transform = x ? `translateX(${x}px)` : ""
    actionsEl.style.opacity = String(Math.min(1, -x / Math.max(width(), 1)))
  }
  const settle = useCallback((next: boolean) => {
    place(next ? -width() : 0, true)
    setOpen(next)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = () => settle(false)
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow()
    closeOpenRow = close
    const outside = (event: globalThis.PointerEvent) => {
      if (!row.current?.contains(event.target as Node)) close()
    }
    document.addEventListener("pointerdown", outside)
    return () => {
      document.removeEventListener("pointerdown", outside)
      if (closeOpenRow === close) closeOpenRow = null
    }
  }, [open, settle])

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    drag.current = { x: event.clientX, y: event.clientY, from: offset.current, axis: null, lastX: event.clientX, lastT: event.timeStamp, speed: 0 }
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || start.axis === "y") return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.axis) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        start.axis = "y"
        return
      }
      if (Math.abs(dx) < 8) return
      start.axis = "x"
      event.currentTarget.setPointerCapture(event.pointerId)
      face.current?.classList.add("dragging")
    }
    const dt = Math.max(event.timeStamp - start.lastT, 1)
    start.speed = (event.clientX - start.lastX) / dt
    start.lastX = event.clientX
    start.lastT = event.timeStamp
    const full = width()
    let x = start.from + dx
    if (x > 0) x *= 0.2
    if (x < -full) x = -full + (x + full) * 0.2
    place(x, false)
  }

  function up(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    drag.current = null
    if (!start) return
    face.current?.classList.remove("dragging")
    if (start.axis !== "x") {
      if (open && start.axis === null) {
        swallowClick(event.currentTarget)
        settle(false)
      }
      return
    }
    swallowClick(event.currentTarget)
    const fling = Math.abs(start.speed) > 0.35 ? start.speed < 0 : null
    settle(fling ?? -offset.current > width() / 2)
  }

  function run(action: SwipeAction) {
    const el = row.current
    if (action.tone !== "delete" || !el) {
      settle(false)
      action.onClick()
      return
    }
    const gap = parseFloat(getComputedStyle(el.parentElement ?? el).rowGap) || 0
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    el.style.pointerEvents = "none"
    const slide = still
      ? null
      : face.current?.animate([{ transform: `translateX(${offset.current}px)` }, { transform: "translateX(-105%)" }], { duration: 200, easing: SWIPE_EASE, fill: "forwards" })
    tray.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" })
    const collapse = el.animate(
      [
        { height: `${el.offsetHeight}px`, marginBottom: "0px", opacity: 1 },
        { height: "0px", marginBottom: `${-gap}px`, opacity: 0 },
      ],
      { duration: 220, delay: still ? 0 : 140, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
    )
    Promise.all([slide?.finished, collapse.finished]).then(action.onClick, action.onClick)
  }

  return (
    <div ref={row} className={open ? "swipe-row open" : "swipe-row"}>
      <div ref={tray} className="swipe-actions" aria-hidden={!open || undefined}>
        {actions.map((action) => (
          <button key={action.label} type="button" className={`swipe-action ${action.tone}`} tabIndex={open ? 0 : -1} onClick={() => run(action)}>
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <div ref={face} className="swipe-face" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {children}
      </div>
    </div>
  )
}

function swallowClick(el: HTMLElement) {
  const stop = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
  }
  el.addEventListener("click", stop, { capture: true, once: true })
  window.setTimeout(() => el.removeEventListener("click", stop, { capture: true }), 0)
}

// A person's name with their TripUp tag under it, for every member list.
export function PersonName({ id, you = false }: { id: string; you?: boolean }) {
  const item = person(id)
  if (!item) return null
  return (
    <span className="person-name">
      {you ? `${item.name} (you)` : item.name}
      <small className="person-tag">{item.tag}</small>
    </span>
  )
}

export function CheckRow({ id, on, disabled, note, onClick }: { id: string; on: boolean; disabled?: boolean; note?: string; onClick: () => void }) {
  const item = person(id)
  if (!item) return null
  return (
    <li>
      <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick}>
        <i className={on ? "box on" : "box"}>{on && <img className="asset" src="/assets/icons/check.svg" alt="" />}</i>
        <Face id={id} />
        <span>
          {item.name}
          {note ? <em>{note}</em> : <small className="person-tag">{item.tag}</small>}
        </span>
      </button>
    </li>
  )
}
