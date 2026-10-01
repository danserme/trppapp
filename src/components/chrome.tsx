import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { person } from "../state"
import { IconBack } from "./icons"

export function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className={light ? "status light" : "status"}>
      <span className="time">9:41</span>
      <span className="island" />
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

export function Toolbar({ lead, children }: { lead?: ReactNode; children: ReactNode }) {
  return (
    <footer className="page-bar">
      {lead}
      <div className="sheet-actions">{children}</div>
    </footer>
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
          {note && <em>{note}</em>}
        </span>
      </button>
    </li>
  )
}
