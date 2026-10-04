import type { CSSProperties } from "react"
import { days } from "../data"
import { useStore } from "../state"
import { DaySegments, StatusBar } from "./chrome"

const agenda = [
  { time: "15.00", icon: "/assets/home/w-museum.svg", title: "Museum of Arts", tone: "past" },
  { time: "17.00", icon: "/assets/home/w-hotel.svg", title: "Hotel Da Baixa", tone: "now" },
  { time: "20.00", icon: "/assets/home/w-pin.svg", title: "Dinner · poll 4/5", tone: "next" },
] as const

function AppIcon() {
  return (
    <span className="app-icon" aria-hidden="true">
      <img className="app-icon-sunrise" src="/assets/brand/icon-sunrise.svg" alt="" />
      <span className="app-icon-stamp">
        <img className="app-icon-paper" src="/assets/brand/icon-stamp.svg" alt="" />
        <img className="app-icon-art" src="/assets/brand/icon-landscape.svg" alt="" />
        <b>TripUp</b>
      </span>
    </span>
  )
}

function markLaunch(node: HTMLElement) {
  const box = node.getBoundingClientRect()
  document.documentElement.style.setProperty("--launch-x", `${box.left + box.width / 2}px`)
  document.documentElement.style.setProperty("--launch-y", `${box.top + box.height / 2}px`)
}

export function HomeScreen() {
  const { dispatch } = useStore()
  const launch = (target: "trip" | "map") => (event: { currentTarget: HTMLElement }) => {
    markLaunch(event.currentTarget)
    dispatch({ type: "launch", target })
  }
  return (
    <div className="home">
      <StatusBar
        light
        onOpenTrip={() => {
          const island = document.querySelector<HTMLElement>(".island")
          if (island) markLaunch(island)
          dispatch({ type: "launch", target: "trip" })
        }}
      />
      <button type="button" className="widget widget-trip" onClick={launch("trip")} aria-label="Open Exploring Lisbon">
        <span className="widget-card">
          <span className="widget-left">
            <span>
              <small>TU 6 OCT</small>
              <strong>Exploring Lisbon</strong>
            </span>
            <span className="widget-foot">
              <span className="widget-faces">
                <img src="/assets/faces/w-1.png" alt="" />
                <img src="/assets/faces/w-2.png" alt="" />
                <b>+3</b>
              </span>
              <DaySegments fills={days.map((item) => item.progress)} />
            </span>
          </span>
          <span className="widget-agenda">
            {agenda.map((row) => (
              <span key={row.time} className={`widget-row ${row.tone}`}>
                <b>{row.time}</b>
                <img src={row.icon} alt="" />
                <em>{row.title}</em>
              </span>
            ))}
          </span>
        </span>
        <span className="widget-label">TripUp</span>
      </button>
      <div className="home-row">
        <button type="button" className="widget widget-map" onClick={launch("map")} aria-label="Open trip map">
          <span className="widget-card">
            <img className="widget-map-bg" src="/assets/home/widget-map.png" alt="" />
            <img className="widget-map-shot" src="/assets/home/widget-shot.png" alt="" />
            <span className="widget-map-panel">
              <span>
                <b>Day 2/3</b>
                <em>3 stops left</em>
              </span>
              <DaySegments fills={days.map((item) => item.progress)} />
            </span>
          </span>
          <span className="widget-label">TripUp</span>
        </button>
        <button type="button" className="app-tile" onClick={launch("map")} aria-label="Open TripUp">
          <AppIcon />
          <span className="widget-label">TripUp</span>
        </button>
      </div>
      <span className="home-search" style={{ "--glass": "rgba(153,153,153,0.33)" } as CSSProperties}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="4.2" cy="4.2" r="3.2" fill="none" stroke="#fff" strokeWidth="1.4" />
          <path d="M6.6 6.6 9 9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Search
      </span>
      <span className="home-dock" aria-hidden="true">
        {["phone", "safari", "messages", "music"].map((app) => (
          <img key={app} src={`/assets/home/dock-${app}.png`} alt="" />
        ))}
      </span>
    </div>
  )
}
