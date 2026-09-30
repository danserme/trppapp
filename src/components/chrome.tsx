import type { CSSProperties, ReactNode } from "react"
import { person } from "../state"
import {
  IconBack,
  IconFriends,
  IconGlobe,
  IconNavSearch,
  IconPassport,
} from "./icons"

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

export function TabBar({
  tab,
  onTab,
  onSearch,
}: {
  tab: "trips" | "friends" | "passport"
  onTab: (tab: "trips" | "friends" | "passport") => void
  onSearch: () => void
}) {
  return (
    <div className="tabbar">
      <div className="tab-pill glass">
        <TabButton active={tab === "trips"} label="Trips" onClick={() => onTab("trips")}>
          <IconGlobe active={tab === "trips"} />
        </TabButton>
        <TabButton active={tab === "friends"} label="Friends" onClick={() => onTab("friends")}>
          <IconFriends active={tab === "friends"} />
        </TabButton>
        <TabButton active={tab === "passport"} label="Passport" onClick={() => onTab("passport")}>
          <IconPassport active={tab === "passport"} />
        </TabButton>
      </div>
      <button className="search-btn glass" type="button" aria-label="Search" onClick={onSearch}>
        <IconNavSearch />
      </button>
    </div>
  )
}

function TabButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={active ? "tab active" : "tab"} onClick={onClick}>
      {children}
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

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <footer className="page-bar">
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
