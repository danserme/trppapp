import { useEffect, useRef, useState, type CSSProperties } from "react"
import QRCode from "qrcode"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import {
  activityTypes,
  billItems,
  passportStamps,
  type SharedPhoto,
  tripDays,
  friends,
  initialMembers,
  inviteLink,
  savedPlaces,
  tickets,
  trips,
  type Poll,
  type TripId,
} from "../data"
import { dusk, paper, daylight, type Palette } from "../mapStyle"
import { dayStops, isPastDay, person, shortDate, tripRange, useStore } from "../state"
import { AvatarStack, BackButton, CheckRow, Face, PersonName, SwipeRow, ToolAction, ToolIcon, Toolbar } from "./chrome"
import { CurrentTripCard } from "./TripSheet"
import { StampArt } from "./Passport"
import { IconChevron, IconClose, IconMap, IconPencil, IconPlace, IconPlus, IconSearch, IconShare, IconTrash } from "./icons"

function tripShots(ids: string[], covers: Record<string, string>, shared: SharedPhoto[]) {
  const stamps = ids.flatMap((id) => passportStamps.filter((item) => item.id === id))
  const shots: { stamp: (typeof stamps)[number]; photo: string }[] = []
  const push = (stamp: (typeof stamps)[number], photo: string) => {
    if (!shots.some((item) => item.photo === photo)) shots.push({ stamp, photo })
  }
  for (const stamp of stamps) push(stamp, covers[stamp.id] ?? stamp.image)
  for (const item of shared) {
    const stamp = stamps.find((entry) => entry.id === item.stampId)
    if (stamp && item.src !== stamp.image && !stamp.photos.includes(item.src)) push(stamp, item.src)
  }
  for (const stamp of stamps) for (const photo of stamp.photos) push(stamp, photo)
  return shots.slice(0, 3)
}

const openable = (id: string): id is TripId => trips.some((trip) => trip.id === id)

export function TripList() {
  const { state, dispatch } = useStore()
  const visible = [...trips, ...state.createdTrips].filter((trip) => !state.removedTrips.includes(trip.id) && (state.filter === "all" || trip.when === state.filter))
  const page = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = page.current
    const card = root?.querySelector<HTMLElement>(".trip-list .peek-card")
    if (!root || !card || state.filter !== "all") return
    const head = root.querySelector<HTMLElement>(".list-top")?.offsetHeight ?? 0
    const top = card.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
    const bottom = top + card.offsetHeight
    const floor = root.clientHeight - 128
    let target = root.scrollTop
    if (bottom - target > floor) target = bottom - floor
    if (top - target < head + 8) target = top - head - 8
    if (target !== root.scrollTop) root.scrollTo({ top: Math.max(0, target), behavior: "smooth" })
  }, [state.filter])
  return (
    <div className="page list-page" ref={page}>
      <div className="list-top glass-bar">
        <header className="page-head">
          <h1>My Trips</h1>
          <button type="button" className="glass-icon glass" aria-label="Show trips on map" onClick={() => dispatch({ type: "mode", mode: "map" })}>
            <IconMap />
          </button>
        </header>
        <div className="filters">
          {(["all", "past", "upcoming"] as const).map((filter) => (
            <button key={filter} type="button" className={state.filter === filter ? "on" : ""} onClick={() => dispatch({ type: "filter", filter })}>
              {filter[0].toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="trip-list">
        {visible.map((trip) =>
          trip.when === "current" ? (
            <CurrentTripCard key={trip.id} />
          ) : (
            <SwipeRow
              key={trip.id}
              actions={[
                { label: "Edit", tone: "edit", icon: <IconPencil />, onClick: () => dispatch({ type: "toast", toast: "Editing this trip is off in the demo." }) },
                { label: "Delete", tone: "delete", icon: <IconTrash />, onClick: () => dispatch({ type: "remove-trip", id: trip.id, title: trip.title }) },
              ]}
            >
              <article className={`trip-card ${trip.when}`}>
                <button
                  type="button"
                  className="trip-card-main"
                  onClick={() => {
                    if (openable(trip.id)) dispatch({ type: "open-trip", trip: trip.id })
                    else dispatch({ type: "toast", toast: "Planning opens once someone accepts the invite." })
                  }}
                >
                  <h2>{trip.title}</h2>
                  <p>{trip.dates}</p>
                </button>
                <div className="trip-card-foot">
                  <AvatarStack ids={trip.people.length > 0 ? trip.people.slice(0, 2) : ["ari"]} extra={trip.extra} size={28} surface="grey" />
                  {trip.when === "upcoming" && (
                    <button
                      type="button"
                      className="plan-btn"
                      onClick={() => (openable(trip.id) ? dispatch({ type: "open-trip", trip: trip.id }) : dispatch({ type: "toast", toast: "Planning opens once someone accepts the invite." }))}
                    >
                      Plan trip
                    </button>
                  )}
                </div>
                {trip.stampIds.length > 0 && (
                  <button
                    type="button"
                    className="stamp-row"
                    aria-label={`${trip.title} photos`}
                    onClick={() => {
                      if (!openable(trip.id)) return
                      const days = tripDays(trip.id).map((day) => day.id)
                      const first = days.find((day) => state.photos.some((photo) => photo.day === day))
                      dispatch({ type: "open-trip", trip: trip.id })
                      if (first) dispatch({ type: "day", day: first })
                      dispatch({ type: "trip-tab", tab: "photos" })
                    }}
                  >
                    {tripShots(trip.stampIds, state.stampCovers, state.photos).map(({ stamp, photo }, index) => (
                      <StampArt key={photo} stamp={stamp} photo={photo} style={{ transform: `rotate(${[-8, 4, -3, 7][index % 4]}deg)` }} />
                    ))}
                  </button>
                )}
              </article>
            </SwipeRow>
          ),
        )}
      </div>
    </div>
  )
}

export function FriendsPanel() {
  const { dispatch } = useStore()
  return (
    <div className="sheet panel friends-panel">
      <span className="handle" />
      <header className="trip-head">
        <h1>Friends</h1>
        <button type="button" className="pass-share" aria-label="Add friend" onClick={() => dispatch({ type: "toast", toast: "Adding friends is off in the demo." })}>
          <img className="asset" src="/assets/icons/user-plus.svg" alt="" />
        </button>
      </header>
      <p className="trip-dates">{friends.length} friends on TripUp</p>
      <ul className="member-list plain">
        {friends.map((id) => {
          const item = person(id)
          if (!item) return null
          return (
            <li key={id}>
              <Face id={id} />
              <PersonName id={id} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// The invite QR in the brand style (Figma 91:4412): rounded modules that merge along runs, and rounded corner markers
// with a round eye. Nothing covers the code, so error correction M keeps it sparse.
function BrandQR({ value }: { value: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" })
  const n = modules.size
  const quiet = 1
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const on = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && modules.get(r, c) === 1 && !finder(r, c)
  let d = ""
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!on(r, c)) continue
      const up = on(r - 1, c)
      const down = on(r + 1, c)
      const left = on(r, c - 1)
      const right = on(r, c + 1)
      // A corner is rounded only where neither of its two sides touches another module, so runs read as one stroke.
      const k = (round: boolean) => (round ? 0.5 : 0)
      const [tl, tr, br, bl] = [k(!up && !left), k(!up && !right), k(!down && !right), k(!down && !left)]
      d += `M${c + tl} ${r}H${c + 1 - tr}${tr ? `a.5 .5 0 0 1 .5 .5` : ""}V${r + 1 - br}${br ? `a.5 .5 0 0 1 -.5 .5` : ""}H${c + bl}${bl ? `a.5 .5 0 0 1 -.5 -.5` : ""}V${r + tl}${tl ? `a.5 .5 0 0 1 .5 -.5` : ""}Z`
    }
  }
  const eyes = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]
  return (
    <svg viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`} role="img" aria-label="Invite QR code">
      <path d={d} fill="#111" />
      {eyes.map(([r, c]) => (
        <g key={`${r}-${c}`} fill="#111">
          <path
            fillRule="evenodd"
            d={`M${c + 2.5} ${r}h2a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1 -2.5 2.5h-2a2.5 2.5 0 0 1 -2.5 -2.5v-2a2.5 2.5 0 0 1 2.5 -2.5zM${c + 2.5} ${r + 1}a1.5 1.5 0 0 0 -1.5 1.5v2a1.5 1.5 0 0 0 1.5 1.5h2a1.5 1.5 0 0 0 1.5 -1.5v-2a1.5 1.5 0 0 0 -1.5 -1.5z`}
          />
          <circle cx={c + 3.5} cy={r + 3.5} r={1.5} />
        </g>
      ))}
    </svg>
  )
}

export function InviteScreen() {
  const { state, dispatch } = useStore()
  const query = state.friendQuery.trim().toLowerCase()
  const list = friends.filter((id) => person(id)?.name.toLowerCase().includes(query))
  const picked = state.selectedFriends.filter((id) => !state.members.includes(id)).length
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = () => {
    navigator.clipboard?.writeText(inviteLink).catch(() => undefined)
    setCopied(true)
    dispatch({ type: "toast", toast: "Link copied" })
  }
  return (
    <div className="page invite">
      <header className="invite-head glass-bar">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add members</h1>
        <span />
      </header>
      <p className="hint">Invite anyone, even if they are not on TripUp</p>
      <label className="search-field">
        <IconSearch />
        <input
          value={state.friendQuery}
          placeholder="Name, @TripUpTag, phone, email"
          onChange={(event) => dispatch({ type: "friend-query", query: event.target.value })}
        />
      </label>
      <div className="invite-hero">
        <div className="qr-card">
          <div className="qr">
            <BrandQR value={inviteLink} />
          </div>
          <button type="button" className={copied ? "link-copy copied" : "link-copy"} aria-label={copied ? "Link copied" : "Copy invite link"} onClick={copy}>
            {inviteLink.replace("https://", "").replace("lisbon-hd", "...hd")}
            <span className="link-copy-icon" aria-hidden="true">
              <img className="asset" src="/assets/icons/copy.svg" alt="" />
              <img className="asset" src="/assets/icons/check.svg" alt="" />
            </span>
          </button>
        </div>
        <button type="button" className="share" onClick={copy}>
          <IconShare /> Share group link
        </button>
      </div>
      <h2 className="invite-sub">Add from your friends list</h2>
      <ul className="member-list checks">
        {list.map((id) => {
          const inGroup = state.members.includes(id)
          return (
            <CheckRow
              key={id}
              id={id}
              on={inGroup || state.selectedFriends.includes(id)}
              disabled={inGroup}
              note={inGroup ? "Already in this trip" : undefined}
              onClick={() => dispatch({ type: "toggle-friend", id })}
            />
          )
        })}
        {list.length === 0 && <li className="empty">No friends match “{state.friendQuery}”</li>}
      </ul>
      <Toolbar>
        <ToolAction label={picked > 1 ? `Add ${picked} members` : "Add member"} idle={picked === 0} primary onClick={() => dispatch({ type: "add-members" })} />
      </Toolbar>
    </div>
  )
}

const capital = (text: string) => text[0].toUpperCase() + text.slice(1)

function ActivityPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])
  return (
    <div className="activity-pick" ref={root}>
      <button type="button" className="activity-trigger" aria-label="Activity type" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((next) => !next)}>
        <span>{capital(value)}</span>
        <IconChevron dark />
      </button>
      {open && (
        <div className="menu" role="menu">
          {activityTypes.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitemradio"
              aria-checked={value === type}
              className={value === type ? "on" : ""}
              onClick={() => {
                onChange(type)
                setOpen(false)
              }}
            >
              {capital(type)}
              {value === type && <img className="asset" src="/assets/icons/check.svg" alt="" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function placeFromText(text: string) {
  const known = savedPlaces.find((place) => place.name.toLowerCase() === text.toLowerCase())
  const name = known?.name ?? text
  const id = known?.id ?? name.toLowerCase().replace(/\s+/g, "-")
  return { id, name }
}

export function PollComposer() {
  const { state, dispatch } = useStore()
  const existing = state.pollByDay[state.day]
  const editing = Boolean(existing && state.pollVoting && !state.pollAnchor)
  const meta = tripDays(state.trip).find((day) => day.id === state.day) ?? tripDays(state.trip)[0]
  const [voting, setVoting] = useState(state.pollVoting)
  const [question, setQuestion] = useState(editing ? existing!.question : state.pollVoting ? "What should we do?" : "")
  const [gapFrom, gapTo] = dayStops(state.day).find((stop) => stop.kind === "gap")?.time.split("–") ?? []
  const [from, setFrom] = useState(editing ? existing!.from : (gapFrom ?? "20:00"))
  const [to, setTo] = useState(editing ? existing!.to : (gapTo ?? "22:00"))
  const [date, setDate] = useState(editing ? existing!.date : meta.label)
  const defaultStatus = Number((editing ? existing!.from : (gapFrom ?? "20:00")).split(":")[0]) >= 18 ? "dinner" : "visit"
  const [status, setStatus] = useState(editing ? (existing!.status ?? defaultStatus) : defaultStatus)
  const [place, setPlace] = useState("")
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [draft, setDraft] = useState("")
  const [showVoters, setShowVoters] = useState(existing?.showVoters ?? true)
  const [multiple, setMultiple] = useState(existing?.multiple ?? true)
  const [allowAdd, setAllowAdd] = useState(existing?.allowAdd ?? true)
  const [revoting, setRevoting] = useState(existing?.revoting ?? false)
  const pool = state.trip === "lisbon" ? savedPlaces : []
  const city = trips.find((trip) => trip.id === state.trip)?.title ?? "this city"
  const unsaved = pool.filter((item) => !options.some((option) => option.id === item.id))

  function addDraft() {
    const text = draft.trim()
    if (!text) return
    const next = placeFromText(text)
    setOptions((current) => (current.some((option) => option.id === next.id) ? current : [...current, next]))
    setDraft("")
  }

  function togglePlace(id: string, name: string) {
    setOptions((current) =>
      current.some((option) => option.id === id) ? current.filter((option) => option.id !== id) : [...current, { id, name }],
    )
  }

  function save() {
    const text = place.trim()
    const chosen = voting ? options : text ? [placeFromText(text)] : []
    if (chosen.length === 0) {
      dispatch({ type: "toast", toast: voting ? "Add at least one option" : "Add a place first", tone: "error" })
      return
    }
    const poll: Poll = {
      // A picked place is titled by its name; only a poll has a question.
      question: voting ? question.trim() || "Where should we go?" : chosen[0].name,
      from,
      to,
      date,
      showVoters,
      multiple,
      allowAdd,
      revoting,
      status,
      decided: !voting,
      options: chosen.map((option) => ({ id: option.id, name: option.name, votes: [] })),
    }
    const target = tripDays(state.trip).find((day) => day.label === date)
    if (target && target.id !== state.day) dispatch({ type: "day", day: target.id })
    dispatch({ type: "save-poll", poll })
  }

  return (
    <div className="page composer">
      <header className="invite-head glass-bar">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add to itinerary</h1>
        <span />
      </header>
      <div className="composer-body">
        <div className="composer-main">
          <div className="mode-seg" role="radiogroup" aria-label="How to decide">
            <i className={voting ? "thumb right" : "thumb"} aria-hidden="true" />
            <button type="button" role="radio" aria-checked={!voting} onClick={() => setVoting(false)}>
              <IconPlace /> Pick a place
            </button>
            <button type="button" role="radio" aria-checked={voting} onClick={() => setVoting(true)}>
              <i className="icon-mask poll-icon" aria-hidden="true" /> Open poll
            </button>
          </div>
          {/* A poll asks its question here; a picked place needs no title (the place names the stop), so its place goes
              here instead. */}
          {voting ? (
            <label className="question-field">
              <input
                className="question"
                aria-label="Question"
                value={question}
                enterKeyHint="done"
                placeholder="What should we eat for dinner?"
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
              />
              {question && (
                <button type="button" className="clear" aria-label="Clear question" onClick={() => setQuestion("")}>
                  <IconClose />
                </button>
              )}
            </label>
          ) : (
            <label className="question-field place-field">
              <IconPlace />
              <input
                className="question"
                aria-label="Place"
                value={place}
                enterKeyHint="done"
                placeholder="Paste a link, address or name"
                onChange={(event) => setPlace(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                }}
              />
              {place && (
                <button type="button" className="clear" aria-label="Clear place" onClick={() => setPlace("")}>
                  <IconClose />
                </button>
              )}
            </label>
          )}
          <div className="when-box">
            <div className="when-days" role="radiogroup" aria-label="Day">
              {tripDays(state.trip).map((day) => (
                <button
                  key={day.id}
                  type="button"
                  role="radio"
                  aria-checked={date === day.label}
                  disabled={isPastDay(day.id)}
                  className={date === day.label ? "on" : ""}
                  onClick={() => setDate(day.label)}
                >
                  <small>{day.dow}</small>
                  <strong>{day.date}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="time-row">
            <div className="time-range" title={duration(from, to)}>
              <img className="asset" src="/assets/icons/clock.svg" alt="" />
              <span>From</span>
              <TimeValue label="From" value={from} onChange={setFrom} />
              <span>to</span>
              <TimeValue label="Until" value={to} onChange={setTo} />
            </div>
            <ActivityPicker value={status} onChange={setStatus} />
          </div>
        </div>
        {voting && (
          <section className="form-section">
            <div className="form-label">
              <span>Options{options.length ? ` · ${options.length}` : ""}</span>
            </div>
            <div className="option-box">
              <label className="option-entry">
                <IconPlace />
                <input
                  value={draft}
                  placeholder="Paste a link, address or name"
                  enterKeyHint="done"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addDraft()
                  }}
                />
                {draft && (
                  <button type="button" className="clear" aria-label="Clear option" onClick={() => setDraft("")}>
                    <IconClose />
                  </button>
                )}
              </label>
              {options.map((option) => {
                const photo = savedPlaces.find((item) => item.id === option.id)?.photo
                return (
                  <div key={option.id} className="option-added">
                    {photo ? <img src={photo} alt="" /> : (
                      <i className="option-pin" aria-hidden="true">
                        <IconPlace />
                      </i>
                    )}
                    <span>{option.name}</span>
                    <button type="button" className="clear" aria-label={`Remove ${option.name}`} onClick={() => togglePlace(option.id, option.name)}>
                      <IconClose />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        <section className="form-section saved-section">
          <div className="form-label">
            <span>Your saved places</span>
            <button type="button">View all</button>
          </div>
          <div className="saved-row" role={voting ? undefined : "radiogroup"} aria-label="Saved places" data-vaul-no-drag>
            {pool.length === 0 && (
              <p className="saved-empty">
                <strong>No saved places in {city} yet</strong>
                <em>Bookmark spots on the map and they show up here.</em>
              </p>
            )}
            {voting && pool.length > 0 && unsaved.length === 0 && (
              <p className="saved-empty">
                <strong>All saved places are in</strong>
                <em>Remove an option above to bring it back here.</em>
              </p>
            )}
            {(voting ? unsaved : pool).map((item) => {
              const on = !voting && place.trim().toLowerCase() === item.name.toLowerCase()
              return (
                <button
                  key={item.id}
                  type="button"
                  role={voting ? undefined : "radio"}
                  aria-checked={voting ? undefined : on}
                  className={on ? "saved on" : "saved"}
                  onClick={() => (voting ? togglePlace(item.id, item.name) : setPlace((current) => (current.trim().toLowerCase() === item.name.toLowerCase() ? "" : item.name)))}
                >
                  <span className="saved-photo">
                    <img src={item.photo} alt="" />
                    {voting ? (
                      <i className="saved-badge" aria-hidden="true">
                        <img className="asset" src="/assets/icons/plus.svg" alt="" />
                      </i>
                    ) : (
                      <i className={on ? "saved-radio on" : "saved-radio"} aria-hidden="true" />
                    )}
                  </span>
                  <strong>{item.name}</strong>
                  <em>{item.detail}</em>
                  <small>
                    <i className="stars" style={{ "--fill": `${(Number(item.rating) / 5) * 100}%` } as CSSProperties} aria-label={`${item.rating} out of 5`} />
                    {item.rating}
                  </small>
                </button>
              )
            })}
          </div>
        </section>
        {voting && (
          <>
            <section className="form-section">
              <div className="form-label">
                <span>Poll settings</span>
              </div>
              <div className="settings">
                <Setting label="Show who voted" on={showVoters} onClick={() => setShowVoters((value) => !value)} />
                <Setting label="Allow multiple answers" on={multiple} onClick={() => setMultiple((value) => !value)} />
                <Setting label="Allow adding more options" on={allowAdd} onClick={() => setAllowAdd((value) => !value)} />
                <Setting label="Allow revoting" on={revoting} onClick={() => setRevoting((value) => !value)} />
              </div>
            </section>
          </>
        )}
        <Toolbar>
          <ToolAction label={voting ? "Save poll" : "Save"} idle={voting ? options.length === 0 : !place.trim()} primary onClick={save} />
        </Toolbar>
      </div>
    </div>
  )
}

function duration(from: string, to: string) {
  const minutes = (value: string) => {
    const [h, m] = value.split(":").map(Number)
    return h * 60 + (m || 0)
  }
  let span = minutes(to) - minutes(from)
  if (span <= 0) span += 24 * 60
  const h = Math.floor(span / 60)
  const m = span % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

function Setting({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="switch-row" onClick={onClick}>
      <Toggle on={on} />
      {label}
    </button>
  )
}

function Toggle({ on }: { on: boolean }) {
  return <span className={on ? "toggle on" : "toggle"} aria-hidden="true" />
}

function openPicker(event: { currentTarget: HTMLInputElement }) {
  try {
    event.currentTarget.showPicker()
  } catch {
    // Browsers without showPicker fall back to their native focus behaviour.
  }
}

function TimeValue({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="time-value">
      <b>{value}</b>
      <input
        type="time"
        aria-label={`${label} time`}
        value={value}
        onClick={openPicker}
        onChange={(event) => event.target.value && onChange(event.target.value)}
      />
    </label>
  )
}

const firstName = (id: string) => (id === "ari" ? "Ari" : (person(id)?.name.split(" ")[0] ?? id))

const euro = (value: number) => `${value.toFixed(2).replace(".", ",")} €`

export function BillScreen() {
  const { state, dispatch } = useStore()
  const [splitBy, setSplitBy] = useState<"items" | "exact" | "percent">("items")
  const [payerOpen, setPayerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!dateOpen) return
    const close = (event: PointerEvent) => {
      if (!dateRef.current?.contains(event.target as Node)) setDateOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [dateOpen])
  const [itemNames, setItemNames] = useState<Record<string, string>>({})
  const splitCount = Math.max(state.splitIds.length + 1, 1)
  const total = Number(state.billAmount.replace(",", ".")) || 0
  const sharers = ["ari", ...state.splitIds]
  const [custom, setCustom] = useState<Record<"exact" | "percent", Record<string, string>>>({ exact: {}, percent: {} })
  const evenShare = (id: string) => {
    const whole = splitBy === "exact" ? Math.round(total * 100) : 100
    const base = Math.floor(whole / sharers.length)
    const part = id === sharers[sharers.length - 1] ? whole - base * (sharers.length - 1) : base
    return splitBy === "exact" ? (part / 100).toFixed(2).replace(".", ",") : String(part)
  }
  const shareOf = (id: string) => (splitBy === "items" ? "" : (custom[splitBy][id] ?? evenShare(id)))
  const assigned = sharers.reduce((sum, id) => sum + (Number(shareOf(id).replace(",", ".")) || 0), 0)
  const left = (splitBy === "exact" ? total : 100) - assigned
  const leftLabel = splitBy === "exact" ? euro(Math.abs(left)) : `${Math.round(Math.abs(left) * 10) / 10}%`
  return (
    <div className="page bill">
      <header className="invite-head glass-bar">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add bill</h1>
        <span />
      </header>
      <div className="amount">
        <label className="amount-value">
          <input
            inputMode="decimal"
            aria-label="Amount"
            value={state.billAmount}
            size={Math.max(state.billAmount.length, 1)}
            onChange={(event) => dispatch({ type: "bill", patch: { billAmount: event.target.value } })}
          />
          <span>€</span>
        </label>
      </div>
      <div className="paid-by">
        <button type="button" className="payer" aria-haspopup="menu" aria-expanded={payerOpen} onClick={() => setPayerOpen((open) => !open)}>
          <Face id={state.billPayer} size={26} />
          <span>
            <small>Paid by</small> {firstName(state.billPayer)}
          </span>
          <IconChevron />
        </button>
        {payerOpen && (
          <div className="menu payer-menu" role="menu">
            {["ari", ...state.members].map((id) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={state.billPayer === id}
                className={state.billPayer === id ? "on" : ""}
                onClick={() => {
                  dispatch({ type: "bill", patch: { billPayer: id } })
                  setPayerOpen(false)
                }}
              >
                <Face id={id} size={22} />
                {id === "ari" ? "You" : person(id)?.name}
                {state.billPayer === id && <img className="asset" src="/assets/icons/check.svg" alt="" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bill-when">
        <div className="bill-pick" ref={dateRef}>
          <button type="button" className="meta-pill" aria-label="Bill date" aria-expanded={dateOpen} onClick={() => setDateOpen((open) => !open)}>
            <img className="asset" src="/assets/icons/calendar.svg" alt="" />
            {fromIso(state.billDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </button>
          {dateOpen && (
            <div className="calendar-card compact bill-cal">
              <DayPicker
                mode="single"
                weekStartsOn={1}
                required
                defaultMonth={fromIso(state.billDate)}
                selected={fromIso(state.billDate)}
                onSelect={(date) => {
                  dispatch({ type: "bill", patch: { billDate: toIso(date) } })
                  setDateOpen(false)
                }}
              />
            </div>
          )}
        </div>
        <label className="meta-pill place-pill">
          <img className="asset" src="/assets/icons/place.svg" alt="" />
          <input
            aria-label="Place"
            value={state.billPlace}
            placeholder="Add place"
            enterKeyHint="done"
            onChange={(event) => dispatch({ type: "bill", patch: { billPlace: event.target.value } })}
          />
        </label>
      </div>
      <h2 className="split-title">Split by</h2>
      <div className="seg">
        {(
          [
            ["items", "Per items"],
            ["exact", "Exact amount"],
            ["percent", "Percentage"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={splitBy === id ? "on" : ""} onClick={() => setSplitBy(id)}>
            {label}
          </button>
        ))}
      </div>
      <ul className="bill-items">
        {splitBy === "items"
          ? billItems.map((item) => {
              const sum = item.qty * item.price
              return (
                <li key={item.id} className="bill-item">
                  <span className="bill-qty">{item.qty}×</span>
                  <div className="bill-row">
                    <label className="bill-name">
                      <input
                        aria-label="Item name"
                        value={itemNames[item.id] ?? item.name}
                        onChange={(event) => setItemNames((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      />
                      <button
                        type="button"
                        className="item-edit"
                        aria-label={`Edit ${itemNames[item.id] ?? item.name}`}
                        onClick={(event) => {
                          const input = event.currentTarget.previousElementSibling as HTMLInputElement
                          input.focus()
                          input.select()
                        }}
                      >
                        <img src="/assets/icons/pencil-grey-sm.svg" alt="" />
                      </button>
                    </label>
                    <b className="bill-sum">{euro(sum)}</b>
                  </div>
                  <div className="bill-row bill-meta">
                    <span>{item.qty > 1 ? `${euro(item.price)} each` : "1 item"}</span>
                    <button type="button" className="bill-split" aria-label={`Split ${item.name}, ${euro(sum / splitCount)} per person`} onClick={() => dispatch({ type: "split", open: true })}>
                      <AvatarStack ids={state.splitIds.slice(0, 2)} extra={Math.max(splitCount - 2, 0)} size={22} />
                      <b>{euro(sum / splitCount)}</b>
                    </button>
                  </div>
                </li>
              )
            })
          : sharers.map((id) => (
              <li key={id}>
                <div className="bill-row">
                  <span className="bill-person">
                    <Face id={id} size={22} />
                    {id === "ari" ? "You" : person(id)?.name}
                  </span>
                  <label className="share-field">
                    <input
                      inputMode="decimal"
                      aria-label={`${splitBy === "exact" ? "Amount" : "Percentage"} for ${id === "ari" ? "you" : person(id)?.name}`}
                      value={shareOf(id)}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d.,]/g, "")
                        setCustom((prev) => ({ ...prev, [splitBy]: { ...prev[splitBy], [id]: value } }))
                      }}
                    />
                    <span>{splitBy === "exact" ? "€" : "%"}</span>
                  </label>
                </div>
              </li>
            ))}
      </ul>
      {splitBy !== "items" && (
        <p className={Math.abs(left) < 0.005 ? "share-left ok" : "share-left"}>
          {Math.abs(left) < 0.005 ? (
            <>Adds up to {splitBy === "exact" ? euro(total) : "100%"}</>
          ) : (
            <>
              {leftLabel} {left > 0 ? "left to assign" : "over the total"}
              <button type="button" onClick={() => setCustom((prev) => ({ ...prev, [splitBy]: {} }))}>
                Split evenly
              </button>
            </>
          )}
        </p>
      )}
      <Toolbar lead={<ToolIcon label="Scan receipt" icon="scan" onClick={() => dispatch({ type: "toast", toast: "Point the camera at the receipt" })} />}>
        <ToolAction label="Save bill" idle={total <= 0 || !state.billPlace.trim()} primary onClick={() => dispatch({ type: "save-bill" })} />
      </Toolbar>
      {state.splitOpen && (
        <div className="split-layer">
          <button type="button" className="scrim" aria-label="Close split" onClick={() => dispatch({ type: "split", open: false })} />
          <div className="split-sheet">
            <h2>Split between</h2>
            <ul className="member-list checks">
              {[...state.members, "ren"].map((id) => (
                <CheckRow key={id} id={id} on={state.splitIds.includes(id)} onClick={() => dispatch({ type: "toggle-split", id })} />
              ))}
            </ul>
            <Toolbar variant="sheet" lead={<ToolIcon label="Back" icon="back" onClick={() => dispatch({ type: "split", open: false })} />}>
              <ToolAction label="Save" icon="check" onClick={() => dispatch({ type: "split", open: false })} />
            </Toolbar>
          </div>
        </div>
      )}
    </div>
  )
}

export function TicketScreen() {
  const { state, dispatch } = useStore()
  const ticket = tickets[state.ticket] ?? tickets.pass
  const [svg, setSvg] = useState("")
  useEffect(() => {
    QRCode.toString(ticket.code, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0e1a36", light: "#00000000" } }).then((value) => {
      setSvg(value.replace(/fill="#00000000"/g, 'fill="none"'))
    })
  }, [ticket.code])
  return (
    <div className="page ticket-page">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>{ticket.title}</h1>
        <span />
      </header>
      <article className={`ticket ${ticket.mode}`}>
        <div className="ticket-top">
          <p className="ticket-carrier">
            <span>{ticket.carrier}</span>
            <span>{ticket.date}</span>
          </p>
          <div className="ticket-route">
            <div>
              <strong>{ticket.from.code}</strong>
              <em>{ticket.from.city}</em>
              <b>{ticket.from.time}</b>
            </div>
            <span className="ticket-line" aria-hidden="true">
              <img className="asset" src={ticket.mode === "flight" ? "/assets/passport/plane.svg" : "/assets/icons/tram.svg"} alt="" />
            </span>
            <div>
              <strong>{ticket.to.code}</strong>
              <em>{ticket.to.city}</em>
              <b>{ticket.to.time}</b>
            </div>
          </div>
        </div>
        <dl className={ticket.rows.length % 3 === 0 ? "ticket-rows" : "ticket-rows two"}>
          {ticket.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="ticket-tear" aria-hidden="true" />
        <div className="ticket-qr">
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <small>{ticket.code}</small>
        </div>
      </article>
      <Toolbar>
        <ToolAction label="Add to Wallet" icon="ticket" onClick={() => dispatch({ type: "toast", toast: "Added to Apple Wallet." })} />
      </Toolbar>
    </div>
  )
}

export function ReservationScreen() {
  const { dispatch } = useStore()
  return (
    <div className="page">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Reservation</h1>
        <span />
      </header>
      <article className="reserve">
        <img src="/assets/stamp.png" alt="" />
        <h2>Hotel Da Baixa</h2>
        <p>5 Oct – 8 Oct, 2026</p>
        <p>Rua da Prata 82, Baixa, Lisbon</p>
        <div className="confirm">
          <small>Confirmation</small>
          <strong>HD-2048</strong>
        </div>
        <a href="https://trip.up/stay/hd-2048" target="_blank" rel="noreferrer">
          Open reservation link
        </a>
      </article>
    </div>
  )
}

export function SearchScreen() {
  const { state, dispatch } = useStore()
  const results = trips.filter((trip) => trip.title.toLowerCase().includes(state.search.toLowerCase()))
  return (
    <div className="page search-page">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Search</h1>
        <span />
      </header>
      <label className="search-field">
        <IconSearch />
        <input
          autoFocus
          value={state.search}
          placeholder="Trips, places, people"
          onChange={(event) => dispatch({ type: "search", search: event.target.value })}
        />
      </label>
      <ul className="search-results">
        {results.length === 0 && <li className="empty">No trips match “{state.search}”</li>}
        {results.map((trip) => (
          <li key={trip.id}>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "overlay", overlay: null })
                if (trip.id === "lisbon") dispatch({ type: "open-trip" })
                else dispatch({ type: "mode", mode: "list" })
              }}
            >
              <strong>{trip.title}</strong>
              <em>{trip.dates}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StyleScreen() {
  const { state, dispatch } = useStore()
  const fields: { key: keyof Palette; label: string }[] = [
    { key: "land", label: "Land" },
    { key: "water", label: "Water" },
    { key: "park", label: "Parks" },
    { key: "road", label: "Roads" },
    { key: "route", label: "Route" },
  ]
  return (
    <div className="style-pop">
      <div className="style-card">
        <header>
          <h2>Map colors</h2>
          <button type="button" onClick={() => dispatch({ type: "overlay", overlay: null })}>
            Done
          </button>
        </header>
        <div className="presets">
          {(
            [
              ["Daylight", daylight],
              ["Paper", paper],
              ["Dusk", dusk],
            ] as const
          ).map(([label, palette]) => (
            <button key={label} type="button" onClick={() => dispatch({ type: "palette", palette })}>
              <i style={{ background: palette.water }} />
              <i style={{ background: palette.land }} />
              <i style={{ background: palette.route }} />
              {label}
            </button>
          ))}
        </div>
        {fields.map((field) => (
          <label key={field.key} className="color-row">
            {field.label}
            <input
              type="color"
              value={state.palette[field.key]}
              onChange={(event) =>
                dispatch({ type: "palette", palette: { ...state.palette, [field.key]: event.target.value } })
              }
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function isMapsList(link: string) {
  if (!link) return true
  try {
    const url = new URL(/^https?:\/\//.test(link) ? link : `https://${link}`)
    const host = url.hostname.replace(/^www\./, "")
    return host === "maps.app.goo.gl" || host === "goo.gl" || (/^(maps\.)?google\.[a-z.]+$/.test(host) && (host.startsWith("maps.") || url.pathname.startsWith("/maps")))
  } catch {
    return false
  }
}

function SavedListField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const link = value.trim()
  const invalid = !isMapsList(link)
  return (
    <label className={invalid ? "edit-field saved-list invalid" : "edit-field saved-list"}>
      <span>Google Maps saved list</span>
      <input
        type="url"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        placeholder="maps.app.goo.gl/…"
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <small>{invalid ? "Paste a Google Maps list link." : "Share the list in Google Maps and paste the link here."}</small>
    </label>
  )
}

export function EditTrip() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState(state.tripTitle)
  const [start, setStart] = useState(state.tripStart)
  const [end, setEnd] = useState(state.tripEnd)
  const [members, setMembers] = useState(state.members)
  const [savedList, setSavedList] = useState(state.savedList)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const nights = end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : 0

  function save() {
    if (!isMapsList(savedList.trim())) return dispatch({ type: "toast", toast: "That link isn’t a Google Maps list", tone: "error" })
    dispatch({ type: "edit-trip", title, start, end: end || start, members, savedList: savedList.trim() })
  }
  return (
    <div className="page edit-page">
      <header className="invite-head glass-bar">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Edit trip</h1>
        <span />
      </header>
      <label className="edit-field">
        <span>Trip name</span>
        <input value={title} placeholder="Name your trip" onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="edit-field">
        <span>Dates</span>
        <button type="button" className={calendarOpen ? "date-range open" : "date-range"} aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}>
          <img className="asset" src="/assets/icons/calendar.svg" alt="" />
          <b>{end ? tripRange(start, end) : `${shortDate(start)} – pick an end date`}</b>
          <em>{nights > 0 ? `${nights} nights` : ""}</em>
        </button>
        {calendarOpen && (
          <div className="calendar-card">
            <DayPicker
              mode="range"
              weekStartsOn={1}
              defaultMonth={fromIso(start)}
              selected={{ from: fromIso(start), to: end ? fromIso(end) : undefined }}
              onSelect={(range) => {
                if (!range?.from) return
                setStart(toIso(range.from))
                setEnd(range.to ? toIso(range.to) : "")
              }}
            />
          </div>
        )}
      </div>
      <SavedListField value={savedList} onChange={setSavedList} />
      <div className="edit-field">
        <span>Members · {members.length + 1}</span>
        <ul className="member-list edit-members">
          <li>
            <Face id="ari" />
            <PersonName id="ari" you />
            <em>Organiser</em>
          </li>
          {members.map((id) => (
            <li key={id}>
              <Face id={id} />
              <PersonName id={id} />
              <button
                type="button"
                className="member-remove"
                aria-label={`Remove ${person(id)?.name ?? id}`}
                onClick={() => setMembers((list) => list.filter((item) => item !== id))}
              >
                <IconClose />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="add-row" onClick={() => dispatch({ type: "overlay", overlay: "invite" })}>
          <IconPlus /> Add members
        </button>
      </div>
      <Toolbar>
        <ToolAction label="Save changes" idle={!title.trim() || !isMapsList(savedList.trim())} primary onClick={save} />
      </Toolbar>
    </div>
  )
}

function fromIso(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const joinCities = (names: string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`)

export function NewTrip() {
  const { dispatch } = useStore()
  const [cities, setCities] = useState([{ id: 0, name: "" }])
  const nextCity = useRef(1)
  const focusCity = useRef<number | null>(null)
  const cityInputs = useRef(new Map<number, HTMLInputElement>())
  const named = cities.map((city) => city.name.trim()).filter(Boolean)
  const place = joinCities(named)
  const [title, setTitle] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [members, setMembers] = useState<string[]>([])
  const [savedList, setSavedList] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)
  const nights = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : 0
  const people = [...initialMembers, ...friends]

  useEffect(() => {
    if (focusCity.current === null) return
    cityInputs.current.get(focusCity.current)?.focus()
    focusCity.current = null
  }, [cities])

  function addCity() {
    const id = nextCity.current++
    focusCity.current = id
    setCities((list) => [...list, { id, name: "" }])
  }

  function create() {
    const name = title.trim() || place
    if (!isMapsList(savedList.trim())) return dispatch({ type: "toast", toast: "That link isn’t a Google Maps list", tone: "error" })
    if (!name) return dispatch({ type: "toast", toast: "Where are you going?", tone: "error" })
    if (!start) return dispatch({ type: "toast", toast: "Pick the dates first", tone: "error" })
    dispatch({
      type: "create-trip",
      trip: {
        id: `new-${Date.now()}`,
        title: name,
        dates: tripRange(start, end || start),
        when: "upcoming",
        extra: Math.max(0, members.length - 2),
        people: members,
        stampIds: [],
        cities: named,
        savedList: savedList.trim() || undefined,
      },
    })
  }

  return (
    <div className="page edit-page">
      <header className="invite-head glass-bar">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add trip</h1>
        <span />
      </header>
      <div className="form-stack">
        <section className="form-section">
          <div className="form-label">
            <span>{cities.length > 1 ? `Where · ${cities.length} cities` : "Where"}</span>
          </div>
          <ol className="city-list">
            {cities.map((city, index) => (
              <li key={city.id} className="city-row">
                {cities.length > 1 && <b aria-hidden="true">{index + 1}</b>}
                <input
                  ref={(el) => {
                    if (el) cityInputs.current.set(city.id, el)
                    else cityInputs.current.delete(city.id)
                  }}
                  value={city.name}
                  aria-label={`City ${index + 1}`}
                  placeholder={index === 0 ? "City or country" : "Next city"}
                  enterKeyHint={index === cities.length - 1 ? "next" : undefined}
                  onChange={(event) => setCities((list) => list.map((item) => (item.id === city.id ? { ...item, name: event.target.value } : item)))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === cities.length - 1 && city.name.trim()) addCity()
                  }}
                />
                {cities.length > 1 && (
                  <button
                    type="button"
                    className="city-remove"
                    aria-label={`Remove ${city.name.trim() || `city ${index + 1}`}`}
                    onClick={() => setCities((list) => list.filter((item) => item.id !== city.id))}
                  >
                    <IconClose />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <button type="button" className="add-row inline" onClick={addCity}>
            <IconPlus /> Add another city
          </button>
        </section>
        <section className="form-section">
          <div className="form-label">
            <span>When</span>
          </div>
          <button type="button" className={calendarOpen ? "date-range open" : "date-range"} aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}>
            <img className="asset" src="/assets/icons/calendar.svg" alt="" />
            <b className={start ? "" : "placeholder"}>{start ? (end ? tripRange(start, end) : `${shortDate(start)} – pick an end date`) : "Pick dates"}</b>
            <em>{nights > 0 ? `${nights} nights` : ""}</em>
          </button>
          {calendarOpen && (
            <div className="calendar-card compact">
              <DayPicker
                mode="range"
                weekStartsOn={1}
                defaultMonth={start ? fromIso(start) : new Date(2026, 10)}
                disabled={{ before: new Date(2026, 9, 1) }}
                selected={start ? { from: fromIso(start), to: end ? fromIso(end) : undefined } : undefined}
                onSelect={(range) => {
                  setStart(range?.from ? toIso(range.from) : "")
                  setEnd(range?.to ? toIso(range.to) : "")
                }}
              />
              <div className="calendar-ok">
                <button type="button" disabled={!start} onClick={() => setCalendarOpen(false)}>
                  OK
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="form-section">
          <div className="form-label">
            <span>Who’s coming</span>
            <small>{members.length > 0 ? `You + ${members.length}` : "Just you"}</small>
          </div>
          <ul className="people-grid">
            {people.map((id) => {
              const on = members.includes(id)
              const name = person(id)?.name ?? id
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={on ? "person-pick on" : "person-pick"}
                    aria-pressed={on}
                    aria-label={name}
                    onClick={() => setMembers((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))}
                  >
                    <span className="person-pick-face">
                      <Face id={id} size={56} />
                      <i aria-hidden="true">
                        <img className="asset" src="/assets/icons/check.svg" alt="" />
                      </i>
                    </span>
                    <span className="person-pick-name">{name.split(" ")[0]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
        <section className="form-section">
          <div className="form-label">
            <span>Details</span>
            <small>Optional</small>
          </div>
          <div className="details-card">
            <label className="details-row">
              <span>Trip name</span>
              <input value={title} placeholder={place ? (named.length > 1 ? place : `Weekend in ${place}`) : "Name your trip"} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <SavedListField value={savedList} onChange={setSavedList} />
          </div>
        </section>
      </div>
      <Toolbar>
        <ToolAction label="Create trip" idle={!(title.trim() || place) || !start || !isMapsList(savedList.trim())} primary onClick={create} />
      </Toolbar>
    </div>
  )
}
