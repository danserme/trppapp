import type { Stop } from "../data"

function Mark({ src, className }: { src: string; className?: string }) {
  return <img className={className ? `asset ${className}` : "asset"} src={src} alt="" />
}

const glyphs = {
  ticket: "/assets/icons/ticket.svg",
  bed: "/assets/icons/home.svg",
  moon: "/assets/icons/moon.svg",
  pin: "/assets/icons/geotag-activity.svg",
} as const

type Glyph = keyof typeof glyphs

export function activityGlyph(stop: Pick<Stop, "kind" | "status" | "title">): Glyph {
  const status = stop.status.toLowerCase()
  const title = stop.title.toLowerCase()
  if (stop.kind === "flight" || status === "landed" || status === "depart") return "ticket"
  if (status === "resting" || title.includes("hotel")) return "bed"
  if (status === "night") return "moon"
  return "pin"
}

export function ActivityIcon({ stop }: { stop: Pick<Stop, "kind" | "status" | "title"> }) {
  return <Mark src={glyphs[activityGlyph(stop)]} />
}

export function IconSliders() {
  return <Mark src="/assets/icons/filter.svg" />
}

export function IconList() {
  return <Mark src="/assets/icons/list.svg" />
}

export function IconMap() {
  return <Mark src="/assets/icons/map.svg" />
}

export function IconLocate() {
  return <Mark className="locate-icon" src="/assets/icons/locate.svg" />
}

export function IconSearch() {
  return <Mark src="/assets/icons/search.svg" />
}

export function IconBack() {
  return <Mark src="/assets/icons/back.svg" />
}

export function IconPlus() {
  return <Mark src="/assets/icons/plus.svg" />
}

export function IconFlight() {
  return <Mark src="/assets/icons/flight.svg" />
}

export function IconPin() {
  return <Mark src="/assets/icons/place.svg" />
}

export function IconChevron({ dark }: { dark?: boolean }) {
  return <Mark className="chevron" src={dark ? "/assets/icons/chevron-dark.svg" : "/assets/icons/chevron.svg"} />
}

export function IconFile() {
  return <Mark src="/assets/icons/copy.svg" />
}

export function IconShare() {
  return <Mark src="/assets/icons/share.svg" />
}
