import { useRef, useState, type CSSProperties, type PointerEvent } from "react"
import { passportStamps } from "../data"
import { useStore } from "../state"
import { BackButton } from "./chrome"

export function PassportPanel() {
  const { dispatch } = useStore()
  const [all, setAll] = useState(false)
  return (
    <div className="sheet panel passport-panel">
      <span className="handle" />
      <header className="pass-head">
        <img className="pass-avatar" src="/assets/passport/avatar.png" alt="" />
        <div className="pass-id">
          <h1>Passport</h1>
          <p>
            <span className="pass-tag">@ari.mendoza</span>
            <em>Explorer Lv4</em>
          </p>
        </div>
        <button type="button" className="pass-share" aria-label="Share passport" onClick={() => dispatch({ type: "toast", toast: "Passport link copied." })}>
          <img className="asset" src="/assets/passport/share.svg" alt="" />
        </button>
      </header>
      <dl className="pass-numbers">
        <div>
          <dd>3</dd>
          <dt>Countries</dt>
        </div>
        <div>
          <dd>6</dd>
          <dt>Cities</dt>
        </div>
        <div>
          <dd>21</dd>
          <dt>Nights away</dt>
        </div>
      </dl>
      <div className="pass-cards">
        <article className="pass-card">
          <small>
            <img className="asset" src="/assets/passport/plane.svg" alt="" /> Furthest hop
          </small>
          <strong>AMS → LIS</strong>
          <em>1,860 km · TU 834</em>
        </article>
        <button type="button" className="pass-card" onClick={() => dispatch({ type: "open-trip", trip: "tokyo" })}>
          <small>
            <img className="asset" src="/assets/passport/plane.svg" alt="" /> Next trip
          </small>
          <strong>Tokyo</strong>
          <em>Nov 11 · in 36 days</em>
          <img className="asset pass-card-go" src="/assets/passport/chevron.svg" alt="" />
        </button>
      </div>
      <div className="stamps-head">
        <h2>Stamps created</h2>
        <button type="button" onClick={() => setAll((open) => !open)}>
          {all ? "Show less" : "View all"}
        </button>
      </div>
      <div className={all ? "stamp-strip all" : "stamp-strip"} data-vaul-no-drag>
        {passportStamps.map((stamp) => (
          <button
            key={stamp.id}
            type="button"
            className="pass-stamp-btn"
            aria-label={`${stamp.city} stamp`}
            style={{ "--tilt": `${stamp.tilt}deg` } as CSSProperties}
            onClick={() => dispatch({ type: "stamp", id: stamp.id })}
          >
            <img src={stamp.image} alt="" draggable={false} />
            {all && <span>{stamp.city}</span>}
          </button>
        ))}
        <button type="button" className="add-stamp" aria-label="Create a stamp" onClick={() => dispatch({ type: "toast", toast: "Stamps unlock when a trip ends." })}>
          <img src="/assets/passport/add-stamp.svg" alt="" />
        </button>
      </div>
    </div>
  )
}

const FLIP = 180

export function StampViewer() {
  const { state, dispatch } = useStore()
  const stamp = passportStamps.find((item) => item.id === state.stamp)
  const [turn, setTurn] = useState({ y: 0, x: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; from: number; lastX: number; lastT: number; speed: number; moved: boolean } | null>(null)
  if (!stamp) return null

  function settle(target: number) {
    setTurn({ y: target, x: 0 })
    if (Math.abs(target) >= FLIP * 2) {
      window.setTimeout(() => {
        dispatch({ type: "gallery", open: true })
        setTurn({ y: 0, x: 0 })
      }, 620)
    }
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, from: turn.y, lastX: event.clientX, lastT: event.timeStamp, speed: 0, moved: false }
    setDragging(true)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true
    const dt = Math.max(event.timeStamp - start.lastT, 1)
    start.speed = (event.clientX - start.lastX) / dt
    start.lastX = event.clientX
    start.lastT = event.timeStamp
    setTurn({ y: start.from + dx * 1.1, x: Math.max(-24, Math.min(24, -dy * 0.25)) })
  }

  function up() {
    const start = drag.current
    drag.current = null
    setDragging(false)
    if (!start) return
    if (!start.moved) {
      settle(turn.y + FLIP)
      return
    }
    const fling = Math.abs(start.speed) > 0.6 ? Math.sign(start.speed) * FLIP * 0.6 : 0
    const target = Math.round((turn.y + fling) / FLIP) * FLIP
    settle(Math.max(-FLIP * 2, Math.min(FLIP * 2, target)))
  }

  const style = { transform: `rotateX(${turn.x}deg) rotateY(${turn.y}deg) rotate(${stamp.tilt}deg)` }
  return (
    <div className="stamp-stage" role="dialog" aria-label={`${stamp.city} stamp`}>
      <header className="stamp-stage-head">
        <BackButton onClick={() => dispatch({ type: "stamp", id: null })} />
        <span>
          <strong>{stamp.city}</strong>
          <em>
            {stamp.country} · {stamp.date}
          </em>
        </span>
        <span />
      </header>
      <div className="stamp-3d" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className={dragging ? "stamp-card dragging" : "stamp-card"} style={style}>
          <img className="stamp-face" src={stamp.image} alt="" draggable={false} />
          <div className="stamp-back">
            <small>TripUp passport</small>
            <strong>{stamp.city}</strong>
            <em>{stamp.date}</em>
            <b>{stamp.photos.length} photos</b>
          </div>
        </div>
      </div>
      <p className="stamp-hint">Drag to turn it. Flip it all the way round to open the photos.</p>
    </div>
  )
}

export function StampGallery() {
  const { state, dispatch } = useStore()
  const stamp = passportStamps.find((item) => item.id === state.stamp)
  if (!stamp) return null
  return (
    <div className="page gallery">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "gallery", open: false })} />
        <h1>{stamp.city}</h1>
        <span />
      </header>
      <p className="gallery-sub">
        {stamp.country} · {stamp.date} · {stamp.photos.length} photos
      </p>
      <div className="gallery-grid">
        {stamp.photos.map((src, index) => (
          <figure key={`${src}-${index}`} className={index === 0 ? "wide" : ""}>
            <img src={src} alt="" />
          </figure>
        ))}
      </div>
    </div>
  )
}
