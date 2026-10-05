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
  if (stop.kind === "flight") return "ticket"
  if (title.includes("hotel")) return "bed"
  if (status === "night") return "moon"
  return "pin"
}

export function ActivityIcon({ stop }: { stop: Pick<Stop, "kind" | "status" | "title"> }) {
  return <Mark src={glyphs[activityGlyph(stop)]} />
}

export function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M18.1092 1.89078C17.6989 1.48062 17.1426 1.2502 16.5625 1.2502C15.9824 1.2502 15.4261 1.48062 15.0158 1.89078L14.0517 2.85494L17.145 5.94828L18.1092 4.98411C18.5193 4.57389 18.7497 4.01754 18.7497 3.43744C18.7497 2.85735 18.5193 2.301 18.1092 1.89078ZM16.2608 6.83245L13.1675 3.73911L3.04251 13.8641C2.52822 14.3781 2.15016 15.0123 1.94251 15.7091L1.27584 17.9466C1.24366 18.0546 1.24125 18.1693 1.26889 18.2785C1.29653 18.3877 1.35319 18.4874 1.43285 18.5671C1.51252 18.6468 1.61225 18.7034 1.72147 18.7311C1.8307 18.7587 1.94537 18.7563 2.05334 18.7241L4.29084 18.0574C4.9877 17.8498 5.62181 17.4717 6.13584 16.9574L16.2608 6.83245Z" />
    </svg>
  )
}

export function IconTrash() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
      />
    </svg>
  )
}

export function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
    </svg>
  )
}

export function IconPlace() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      />
    </svg>
  )
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
  return <Mark src="/assets/icons/locate.svg" />
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
