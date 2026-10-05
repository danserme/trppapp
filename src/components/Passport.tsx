import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import { inYear, passportStamps, photosForStamp, stampYear, tokyoDays, tripNights, trips, tripYear, type Stamp } from "../data"
import { PASS, TALL, person, useStore } from "../state"
import { BackButton } from "./chrome"

const stampPhotos: Record<string, string> = Object.fromEntries(["amsterdam", "munich", "porto", "paris", "lisbon"].map((id) => [id, `/assets/passport/stamps/${id}.jpg`]))

function useFitLine<T extends HTMLElement>(text: string, on: boolean) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !on) return
    const fit = () => {
      el.style.fontSize = ""
      el.style.width = "max-content"
      const textWidth = el.scrollWidth
      el.style.width = ""
      const box = el.clientWidth
      const max = parseFloat(getComputedStyle(el).fontSize)
      if (!box || !max || !textWidth) return
      const target = box * 0.98
      if (textWidth <= target) return
      el.style.fontSize = `${Math.max(12, (max * target) / textWidth)}px`
    }
    fit()
    const box = el.parentElement ?? el
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    document.fonts?.ready.then(fit)
    return () => {
      observer.disconnect()
      el.style.fontSize = ""
      el.style.width = ""
    }
  }, [text, on])
  return ref
}

function useStampLook(stamp: Stamp) {
  const { state } = useStore()
  const cover = state.stampCovers[stamp.id] ?? stampPhotos[stamp.id] ?? stamp.image
  const trip = trips.find((item) => item.stampIds.includes(stamp.id))
  const title = trip?.when === "current" ? state.tripTitle : (trip?.title ?? stamp.city)
  const all = photosForStamp(stamp, state.photos)
  return { cover, title, photos: [cover, ...all.filter((src) => src !== cover)] }
}

export function StampArt({ stamp, photo, className = "", style }: { stamp: Stamp; photo?: string; className?: string; style?: CSSProperties }) {
  const look = useStampLook(stamp)
  const cover = photo ?? look.cover
  const title = look.title
  const big = className.split(" ").includes("stamp-face")
  const nameRef = useFitLine<HTMLSpanElement>(title, big)
  const photoRef = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const img = photoRef.current
    setReady(!!img && img.complete && img.naturalWidth > 0)
  }, [cover])
  return (
    <span className={`stamp-art ${className}`} style={style}>
      <span className="stamp-body">
        <img ref={photoRef} className="stamp-photo" src={cover} alt="" draggable={false} onLoad={() => setReady(true)} />
        {ready && <span className="stamp-grain stamp-noise-fine" />}
        {ready && <span className="stamp-grain stamp-noise-coarse" />}
        <img className="stamp-frame" src="/assets/passport/stamp-frame.svg" alt="" draggable={false} />
        <span className="stamp-title">
          <span className="stamp-name" ref={nameRef}>{title}</span>
          <em>{stamp.date}</em>
        </span>
        {/* The laminate goes on last so it coats the title too, like a real sealed sheet. */}
        {big && <span className="stamp-holo stamp-holo-shine" aria-hidden="true" />}
        {big && <span className="stamp-holo stamp-holo-glare" aria-hidden="true" />}
        {big && <span className="stamp-holo stamp-holo-paper" aria-hidden="true" />}
      </span>
    </span>
  )
}

const tripCovers = trips.flatMap((trip) => passportStamps.filter((stamp) => stamp.id === trip.stampIds[0]))

export function PassportPanel() {
  const { state, dispatch } = useStore()
  // Pulling the drawer all the way up lays every stamp out; Expand and Collapse just move the drawer there and back.
  const all = state.snap === TALL
  const stamps = passportStamps.filter((stamp) => inYear(stampYear(stamp), state.year))
  const covers = tripCovers.filter((stamp) => inYear(stampYear(stamp), state.year))
  const nights = trips.filter((trip) => inYear(tripYear(trip), state.year)).reduce((sum, trip) => sum + (tripNights[trip.id] ?? 0), 0)
  const showTokyo = inYear(2026, state.year)
  return (
    <div className="sheet panel passport-panel">
      <span className="handle" />
      <header className="pass-head">
        <img className="pass-avatar" src="/assets/passport/avatar.png" alt="" />
        <div className="pass-id">
          <h1>Passport</h1>
          <p>
            <span className="pass-tag">{person("ari")?.tag}</span>
            <em>Explorer Lv4</em>
          </p>
        </div>
        <button type="button" className="pass-share" aria-label="Edit passport" onClick={() => dispatch({ type: "toast", toast: "Editing is off in the demo." })}>
          <img className="asset" src="/assets/icons/pencil.svg" alt="" />
        </button>
      </header>
      <div className="pass-level">
        <div className="pass-level-row">
          <strong>65% to Explorer Lv5</strong>
          <span>2 more cities</span>
        </div>
        <div className="pass-level-track" aria-hidden="true">
          <i />
        </div>
      </div>
      <div className="pass-body" data-vaul-no-drag>
        <dl className="pass-numbers">
          <div>
            <dd>{new Set(stamps.map((stamp) => stamp.country)).size}</dd>
            <dt>Countries</dt>
          </div>
          <div>
            <dd>{stamps.length}</dd>
            <dt>Cities</dt>
          </div>
          <div>
            <dd>{nights}</dd>
            <dt>Nights away</dt>
          </div>
        </dl>
        <div className="pass-cards">
          <article className="pass-card">
            <small>
              <img className="asset" src="/assets/passport/plane.svg" alt="" /> Furthest hop
            </small>
            <span>
              <strong>AMS → LIS</strong>
              <em>1,860 km · TU 834</em>
            </span>
          </article>
          <button type="button" className="pass-card next-trip" onClick={() => dispatch({ type: "open-trip", trip: "tokyo" })}>
            <span>
              <small>in 42 days</small>
              <strong>Tokyo</strong>
              <em>11 Nov – 16 Nov, 2026</em>
            </span>
            <img className="asset pass-card-go" src="/assets/passport/chevron.svg" alt="" />
          </button>
        </div>
        <div className="stamps-head">
          <h2>Stamps created</h2>
          <button type="button" onClick={() => dispatch({ type: "snap", snap: all ? PASS : TALL })}>
            {all ? "Collapse" : "Expand"}
          </button>
        </div>
        <div className={all ? "stamp-strip all" : "stamp-strip"} data-vaul-no-drag>
          {covers.length === 0 && !showTokyo && <p className="stamps-empty">No stamps from {state.year} yet.</p>}
          {covers.map((stamp) => (
            <button
              key={stamp.id}
              type="button"
              className="pass-stamp-btn"
              aria-label={`${stamp.city} stamp`}
              style={{ "--tilt": `${stamp.tilt}deg` } as CSSProperties}
              onClick={() => dispatch({ type: "stamp", id: stamp.id })}
            >
              <StampArt stamp={stamp} />
            </button>
          ))}
          {showTokyo && (
            <button type="button" className="future-stamp" aria-label="Tokyo stamp, pending" onClick={() => dispatch({ type: "toast", toast: "Add photos to your trip to create its stamp." })}>
              <strong>Tokyo</strong>
              <span>pending</span>
              <span>{tokyoDays[0].label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const FLIP = 180

export function StampViewer() {
  const { state } = useStore()
  const stamp = passportStamps.find((item) => item.id === state.stamp)
  return stamp ? <StampStage key={stamp.id} stamp={stamp} /> : null
}

function StampStage({ stamp }: { stamp: Stamp }) {
  const { dispatch } = useStore()
  const { photos, title } = useStampLook(stamp)
  const nameRef = useFitLine<HTMLElement>(title, true)
  const [turn, setTurn] = useState({ y: 0, x: 0 })
  const [dragging, setDragging] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const [holo, setHolo] = useState<CSSProperties>({})

  // The foil reads the pointer the way cards-css does: where it sits on the card drives the glare and the
  // rainbow's parallax, and the foil only shows while the pointer is over (or dragging) the stamp.
  function light(event: PointerEvent<HTMLDivElement>) {
    const box = card.current?.getBoundingClientRect()
    if (!box?.width) return
    const x = Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100))
    setHolo({
      "--pointer-x": `${x}%`,
      "--pointer-y": `${y}%`,
      "--background-x": `${37 + x * 0.26}%`,
      "--background-y": `${33 + y * 0.34}%`,
      "--pointer-from-center": Math.min(1, Math.hypot(x - 50, y - 50) / 50),
      "--card-opacity": 1,
    } as CSSProperties)
  }
  const drag = useRef<{ x: number; y: number; from: number; lastX: number; lastT: number; speed: number; moved: boolean } | null>(null)
  function settle(target: number) {
    setTurn({ y: target, x: 0 })
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, from: turn.y, lastX: event.clientX, lastT: event.timeStamp, speed: 0, moved: false }
    setDragging(true)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    light(event)
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
      dispatch({ type: "gallery", open: true })
      return
    }
    const fling = Math.abs(start.speed) > 0.6 ? Math.sign(start.speed) * FLIP * 0.6 : 0
    settle(Math.round((turn.y + fling) / FLIP) * FLIP)
  }

  const style = { ...holo, transform: `rotateX(${turn.x}deg) rotateY(${turn.y}deg) rotate(${stamp.tilt}deg)` }
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
      <div
        className="stamp-3d"
        onPointerDown={(event) => {
          light(event)
          down(event)
        }}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => !drag.current && setHolo((current) => ({ ...current, "--card-opacity": 0 }) as CSSProperties)}
      >
        <div ref={card} className={dragging ? "stamp-card dragging" : "stamp-card"} style={style}>
          <StampArt stamp={stamp} className="stamp-face" />
          <div className="stamp-back">
            <span className="stamp-body">
              <span className="stamp-thumbs">
                {photos.slice(0, 4).map((src) => (
                  <img key={src} src={src} alt="" draggable={false} />
                ))}
              </span>
              <img className="stamp-frame" src="/assets/passport/stamp-frame.svg" alt="" draggable={false} />
              <span className="stamp-back-head">
                <strong ref={nameRef}>{title}</strong>
                <em>{stamp.date}</em>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StampGallery() {
  const { state } = useStore()
  const stamp = passportStamps.find((item) => item.id === state.stamp)
  return stamp ? <GalleryPage stamp={stamp} /> : null
}

function GalleryPage({ stamp }: { stamp: Stamp }) {
  const { dispatch } = useStore()
  const { cover, photos } = useStampLook(stamp)
  return (
    <div className="page gallery">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "gallery", open: false })} />
        <h1>{stamp.city}</h1>
        <span />
      </header>
      <p className="gallery-sub">
        {stamp.country} · {stamp.date} · {photos.length} photos
      </p>
      <div className="gallery-grid">
        {photos.map((src, index) => {
          const liked = src === cover
          return (
            <figure key={src} className={index === 0 ? "wide" : ""}>
              <img src={src} alt="" />
              <button
                type="button"
                className={liked ? "like on" : "like"}
                aria-pressed={liked}
                aria-label={liked ? "Stamp photo" : "Use as stamp photo"}
                onClick={() => !liked && dispatch({ type: "stamp-cover", id: stamp.id, src })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20.3s-7.6-4.6-9.2-9.3C1.7 7.6 3.9 4.4 7.3 4.4c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.4 0 5.6 3.2 4.5 6.6-1.6 4.7-9.2 9.3-9.2 9.3Z" />
                </svg>
              </button>
            </figure>
          )
        })}
      </div>
    </div>
  )
}
