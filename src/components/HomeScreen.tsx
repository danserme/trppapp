import type { CSSProperties, MouseEvent } from "react"
import { days } from "../data"
import { useStore } from "../state"
import { DaySegments, StatusBar } from "./chrome"

const agenda = [
  { time: "15.00", icon: "/assets/home/w-museum.svg", title: "Museum of Arts", tone: "past" },
  { time: "17.00", icon: "/assets/home/w-hotel.svg", title: "Hotel Da Baixa", tone: "now" },
  { time: "20.00", icon: "/assets/home/w-pin.svg", title: "Dinner · poll 4/5", tone: "next" },
] as const

const edgeDots = [
  ...Array.from({ length: 8 }, (_, i) => [3.41 + i * 6.82, 0]),
  ...Array.from({ length: 8 }, (_, i) => [3.41 + i * 6.82, 68.18]),
  ...Array.from({ length: 10 }, (_, i) => [0, 3.41 + i * 6.82]),
  ...Array.from({ length: 10 }, (_, i) => [54.54, 3.41 + i * 6.82]),
]

function AppIcon() {
  return (
    <span className="app-icon" aria-hidden="true">
      <span className="app-icon-stamp">
        <i className="app-icon-paper" />
        {edgeDots.map(([x, y], index) => (
          <i key={index} className="app-icon-dot" style={{ left: x, top: y }} />
        ))}
        <span className="app-icon-art">
          <i className="app-icon-sun" />
          <img src="/assets/home/icon-hill-1.svg" alt="" />
          <img src="/assets/home/icon-hill-2.svg" alt="" />
        </span>
        <b>TripUp</b>
      </span>
    </span>
  )
}

export function HomeScreen() {
  const { dispatch } = useStore()
  const launch = (target: "trip" | "map") => (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    document.documentElement.style.setProperty("--launch-x", `${box.left + box.width / 2}px`)
    document.documentElement.style.setProperty("--launch-y", `${box.top + box.height / 2}px`)
    dispatch({ type: "launch", target })
  }
  return (
    <div className="home">
      <StatusBar light />
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
            <img className="widget-map-route" src="/assets/home/widget-route.svg" alt="" />
            <span className="widget-map-panel">
              <span>
                <b>Day 2/4</b>
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
