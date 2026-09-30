import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import {
  billItems,
  passportStamps,
  tripDays,
  friends,
  inviteLink,
  savedPlaces,
  tickets,
  trips,
  type Poll,
} from "../data"
import { dusk, paper, daylight, type Palette } from "../mapStyle"
import { dayStops, isPastDay, person, shortDate, tripRange, useStore } from "../state"
import { AvatarStack, BackButton, CheckRow, Face, Toolbar } from "./chrome"
import { CurrentTripCard } from "./TripSheet"
import { StampArt } from "./Passport"
import { IconChevron, IconList, IconPlus, IconSearch, IconShare } from "./icons"

function tripShots(ids: string[], covers: Record<string, string>) {
  const stamps = ids.flatMap((id) => passportStamps.filter((item) => item.id === id))
  const shots = stamps.map((stamp) => ({ stamp, photo: covers[stamp.id] ?? stamp.image }))
  for (const stamp of stamps) {
    for (const photo of stamp.photos) if (!shots.some((item) => item.photo === photo)) shots.push({ stamp, photo })
  }
  return shots.slice(0, 3)
}

export function TripList() {
  const { state, dispatch } = useStore()
  const visible = trips.filter((trip) => state.filter === "all" || trip.when === state.filter)
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
      <div className="list-top">
        <header className="page-head">
          <h1>My Trips</h1>
          <button type="button" className="glass-icon glass" aria-label="Show trips on map" onClick={() => dispatch({ type: "mode", mode: "map" })}>
            <IconList />
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
            <article key={trip.id} className={`trip-card ${trip.when}`}>
              <button
                type="button"
                className="trip-card-main"
                onClick={() => {
                  if (trip.id === "tokyo") dispatch({ type: "open-trip", trip: "tokyo" })
                }}
              >
                <h2>{trip.title}</h2>
                <p>{trip.dates}</p>
              </button>
              <div className="trip-card-foot">
                <AvatarStack ids={trip.people.slice(0, 2)} extra={trip.extra} size={28} surface="grey" />
                {trip.when === "upcoming" && (
                  <button type="button" className="plan-btn" onClick={() => dispatch({ type: "overlay", overlay: "tokyo" })}>
                    Plan trip
                  </button>
                )}
              </div>
              {trip.stampIds.length > 0 && (
                <span className="stamp-row" aria-hidden="true">
                  {tripShots(trip.stampIds, state.stampCovers).map(({ stamp, photo }, index) => (
                    <StampArt key={photo} stamp={stamp} photo={photo} style={{ transform: `rotate(${[-8, 4, -3, 7][index % 4]}deg)` }} />
                  ))}
                </span>
              )}
            </article>
          ),
        )}
      </div>
    </div>
  )
}

export function FriendsPanel() {
  const { dispatch } = useStore()
  return (
    <div className="sheet panel">
      <span className="handle" />
      <header className="trip-head">
        <h1>Friends</h1>
        <button type="button" className="pass-share" aria-label="Share invite link" onClick={() => dispatch({ type: "toast", toast: "Invite link copied." })}>
          <IconShare />
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
              <span>{item.name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function InviteScreen() {
  const { state, dispatch } = useStore()
  const [svg, setSvg] = useState("")
  useEffect(() => {
    QRCode.toString(inviteLink, { type: "svg", margin: 0, color: { dark: "#111111", light: "#00000000" } }).then((value) => {
      setSvg(value.replace(/fill="#00000000"/g, 'fill="none"').replace(/fill="#ffffff"/gi, 'fill="none"'))
    })
  }, [])
  const query = state.friendQuery.trim().toLowerCase()
  const list = friends.filter((id) => person(id)?.name.toLowerCase().includes(query))
  const picked = state.selectedFriends.filter((id) => !state.members.includes(id)).length
  return (
    <div className="page invite">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add Members</h1>
        <span />
      </header>
      <div className="invite-hero">
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <button
          type="button"
          className="link-copy"
          onClick={() => {
            navigator.clipboard?.writeText(inviteLink).catch(() => undefined)
            dispatch({ type: "toast", toast: "Link copied" })
          }}
        >
          {inviteLink.replace("https://", "").replace("lisbon-hd", "...hd")}
          <img className="asset" src="/assets/icons/copy.svg" alt="" />
        </button>
        <button
          type="button"
          className="share"
          onClick={() => {
            navigator.clipboard?.writeText(inviteLink).catch(() => undefined)
            dispatch({ type: "toast", toast: "Link copied" })
          }}
        >
          <IconShare /> Share group link
        </button>
      </div>
      <p className="hint">Invite anyone, even if they are not on TripUp</p>
      <label className="search-field">
        <IconSearch />
        <input
          value={state.friendQuery}
          placeholder="Name, @TripUpTag, phone, email"
          onChange={(event) => dispatch({ type: "friend-query", query: event.target.value })}
        />
      </label>
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
        <button type="button" className={picked > 0 ? "add-btn glass" : "add-btn glass idle"} onClick={() => dispatch({ type: "add-members" })}>
          {picked > 1 ? `Add ${picked} members` : "Add member"}
        </button>
      </Toolbar>
    </div>
  )
}

export function PollComposer() {
  const { state, dispatch } = useStore()
  const existing = state.pollByDay[state.day]
  const meta = tripDays(state.trip).find((day) => day.id === state.day) ?? tripDays(state.trip)[0]
  const [voting, setVoting] = useState(state.pollVoting)
  const [question, setQuestion] = useState(existing?.question ?? (state.pollVoting ? "What should we do?" : ""))
  const [gapFrom, gapTo] = dayStops(state.day).find((stop) => stop.kind === "gap")?.time.split("–") ?? []
  const [from, setFrom] = useState(existing?.from ?? gapFrom ?? "20.00")
  const [to, setTo] = useState(existing?.to ?? gapTo ?? "22.00")
  const [date, setDate] = useState(existing?.date ?? meta.label)
  const [options, setOptions] = useState<{ id: string; name: string }[]>(
    existing
      ? existing.options.map((option) => ({
          id: option.id,
          name: option.name ?? savedPlaces.find((place) => place.id === option.id)?.name ?? option.id,
        }))
      : [],
  )
  const [draft, setDraft] = useState("")
  const [showVoters, setShowVoters] = useState(existing?.showVoters ?? true)
  const [multiple, setMultiple] = useState(existing?.multiple ?? true)
  const [allowAdd, setAllowAdd] = useState(existing?.allowAdd ?? true)
  const [revoting, setRevoting] = useState(existing?.revoting ?? false)
  const unsaved = savedPlaces.filter((item) => !options.some((option) => option.id === item.id))

  function addDraft() {
    const text = draft.trim()
    if (!text) return
    const known = savedPlaces.find((place) => place.name.toLowerCase() === text.toLowerCase())
    const id = known?.id ?? text.toLowerCase().replace(/\s+/g, "-")
    const name = known?.name ?? text
    setOptions((current) => (current.some((option) => option.id === id) ? current : [...current, { id, name }]))
    setDraft("")
  }

  function togglePlace(id: string, name: string) {
    setOptions((current) =>
      current.some((option) => option.id === id) ? current.filter((option) => option.id !== id) : [...current, { id, name }],
    )
  }

  function save() {
    if (options.length === 0) {
      dispatch({ type: "toast", toast: voting ? "Add at least one option" : "Pick a place first", tone: "error" })
      return
    }
    const poll: Poll = {
      question: question.trim() || (voting ? "Where should we go?" : options[0].name),
      from,
      to,
      date,
      showVoters,
      multiple,
      allowAdd,
      revoting,
      options: options.map((option) => ({ id: option.id, name: option.name, votes: [] })),
    }
    const target = tripDays(state.trip).find((day) => day.label === date)
    if (target && target.id !== state.day) dispatch({ type: "day", day: target.id })
    dispatch({ type: "save-poll", poll })
  }

  return (
    <div className="page composer">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add to itinerary</h1>
        <span />
      </header>
      <div className="composer-scroll">
        <button type="button" className="switch-row top" aria-pressed={voting} onClick={() => setVoting((value) => !value)}>
          <Toggle on={voting} />
          Decide by voting
        </button>
        <label className="question-field">
          <input
            className="question"
            aria-label={voting ? "Question" : "Title"}
            value={question}
            enterKeyHint="done"
            placeholder={voting ? "Ask the group, e.g. Where should we eat?" : "Give it a title"}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur()
            }}
          />
          {question && (
            <button type="button" className="clear" aria-label="Clear question" onClick={() => setQuestion("")}>
              ×
            </button>
          )}
        </label>
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
                <strong>{day.date.split(" ")[0]}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="time-pair">
          <TimeField label="From" value={from} onChange={setFrom} />
          <span className="time-span">{duration(from, to)}</span>
          <TimeField label="Until" value={to} onChange={setTo} />
        </div>
        <h2>{voting ? "Options" : "Place"}</h2>
        <div className="option-box">
          <label className="option-entry">
            <input
              value={draft}
              placeholder="Paste link or type an address or a name"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addDraft()
              }}
            />
          </label>
          {options.map((option) => (
            <div key={option.id} className="option-added">
              <span>{option.name}</span>
              <button type="button" aria-label={`Remove ${option.name}`} onClick={() => togglePlace(option.id, option.name)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="text-btn" onClick={addDraft}>
            <IconPlus /> {voting ? "Add an option" : "Add a place"}
          </button>
        </div>
        <div className="saved-head">
          <span>
            Add from saved <img className="asset" src="/assets/icons/bookmark.svg" alt="" />
          </span>
          <button type="button">View all</button>
        </div>
        <div className="saved-row" data-vaul-no-drag>
          {unsaved.length === 0 && (
            <p className="saved-empty">
              <strong>All saved places are in</strong>
              <em>Remove an option above to bring it back here.</em>
            </p>
          )}
          {unsaved.map((item) => (
            <button key={item.id} type="button" className="saved" onClick={() => togglePlace(item.id, item.name)}>
              <img src={item.photo} alt="" />
              <span>
                <strong>{item.name}</strong>
                <em>{item.detail}</em>
                <small>
                  {item.rating} <img src="/assets/icons/stars.svg" alt="" />
                </small>
              </span>
            </button>
          ))}
        </div>
        {voting && (
          <>
            <h2>Settings</h2>
            <div className="settings">
              <Setting label="Show who voted" on={showVoters} onClick={() => setShowVoters((value) => !value)} />
              <Setting label="Allow multiple answers" on={multiple} onClick={() => setMultiple((value) => !value)} />
              <Setting label="Allow adding more options" on={allowAdd} onClick={() => setAllowAdd((value) => !value)} />
              <Setting label="Allow revoting" on={revoting} onClick={() => setRevoting((value) => !value)} />
            </div>
          </>
        )}
      </div>
      <Toolbar>
        <button type="button" className="add-btn glass" onClick={save}>
          {voting ? "Save poll" : "Add to itinerary"}
        </button>
      </Toolbar>
    </div>
  )
}

function duration(from: string, to: string) {
  const minutes = (value: string) => {
    const [h, m] = value.split(".").map(Number)
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

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="time-field">
      <small>{label}</small>
      <b>{value}</b>
      <input
        type="time"
        aria-label={`${label} time`}
        value={value.replace(".", ":")}
        onClick={openPicker}
        onChange={(event) => event.target.value && onChange(event.target.value.replace(":", "."))}
      />
    </label>
  )
}

const firstName = (id: string) => (id === "ari" ? "Ari" : (person(id)?.name.split(" ")[0] ?? id))

const euro = (value: number) => `${value.toFixed(2).replace(".", ",")}€`

export function BillScreen() {
  const { state, dispatch } = useStore()
  const [splitBy, setSplitBy] = useState<"items" | "exact" | "percent">("items")
  const [payerOpen, setPayerOpen] = useState(false)
  const splitCount = Math.max(state.splitIds.length + 1, 1)
  const total = Number(state.billAmount.replace(",", ".")) || 0
  const sharers = ["ari", ...state.splitIds]
  const amountRef = useRef<HTMLInputElement>(null)
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
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Add bill</h1>
        <span />
      </header>
      <div className="amount">
        <label className="amount-value">
          <input
            ref={amountRef}
            inputMode="decimal"
            aria-label="Amount"
            value={state.billAmount}
            size={Math.max(state.billAmount.length, 1)}
            onChange={(event) => dispatch({ type: "bill", patch: { billAmount: event.target.value } })}
          />
          <span>€</span>
          <button
            type="button"
            className="amount-edit"
            aria-label="Edit amount"
            onClick={() => {
              amountRef.current?.focus()
              amountRef.current?.select()
            }}
          >
            <img className="asset" src="/assets/icons/pencil.svg" alt="" />
          </button>
        </label>
      </div>
      <div className="paid-by">
        Paid by
        <button type="button" className="payer" aria-haspopup="menu" aria-expanded={payerOpen} onClick={() => setPayerOpen((open) => !open)}>
          <Face id={state.billPayer} size={22} />
          {firstName(state.billPayer)}
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
      <div className="when">
        <label>
          <img className="asset" src="/assets/icons/calendar.svg" alt="" />
          <input value={state.billDate} onChange={(event) => dispatch({ type: "bill", patch: { billDate: event.target.value } })} />
        </label>
        <label className="when-span">
          <img className="asset" src="/assets/icons/place.svg" alt="" />
          <input value={state.billPlace} onChange={(event) => dispatch({ type: "bill", patch: { billPlace: event.target.value } })} />
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
                <li key={item.id}>
                  <div className="bill-row">
                    <strong>{item.name}</strong>
                    <button type="button" aria-label={`Split ${item.name}`} onClick={() => dispatch({ type: "split", open: true })}>
                      <AvatarStack ids={state.splitIds.slice(0, 2)} extra={Math.max(splitCount - 2, 0)} size={28} />
                    </button>
                  </div>
                  <div className="bill-row">
                    <span>
                      {item.qty} x {euro(item.price)}
                    </span>
                    <b>{euro(sum)}</b>
                  </div>
                  <small>{euro(sum / splitCount)}/person</small>
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
      <Toolbar
        lead={
          <button type="button" className="glass-icon glass" aria-label="Scan receipt" onClick={() => dispatch({ type: "toast", toast: "Point the camera at the receipt" })}>
            <img className="asset" src="/assets/icons/scan.svg" alt="" />
          </button>
        }
      >
        <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "save-bill" })}>
          Save bill
        </button>
      </Toolbar>
      {state.splitOpen && (
        <div className="split-layer">
          <button type="button" className="scrim" aria-label="Close split" onClick={() => dispatch({ type: "split", open: false })} />
          <div className="split-sheet">
            <span className="handle" />
            <h2>Split between</h2>
            <ul className="member-list checks">
              {[...state.members, "ren"].map((id) => (
                <CheckRow key={id} id={id} on={state.splitIds.includes(id)} onClick={() => dispatch({ type: "toggle-split", id })} />
              ))}
            </ul>
            <footer className="sheet-bar">
              <BackButton onClick={() => dispatch({ type: "split", open: false })} />
              <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "split", open: false })}>
                Save
              </button>
            </footer>
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
        <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "toast", toast: "Added to Apple Wallet." })}>
          Add to Wallet
        </button>
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

export function EditTrip() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState(state.tripTitle)
  const [start, setStart] = useState(state.tripStart)
  const [end, setEnd] = useState(state.tripEnd)
  const [members, setMembers] = useState(state.members)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const nights = end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : 0
  return (
    <div className="page edit-page">
      <header className="invite-head">
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
      <div className="edit-field">
        <span>Members · {members.length + 1}</span>
        <ul className="member-list edit-members">
          <li>
            <Face id="ari" />
            <span>Ari (you)</span>
            <em>Organiser</em>
          </li>
          {members.map((id) => (
            <li key={id}>
              <Face id={id} />
              <span>{person(id)?.name}</span>
              <button type="button" className="remove" onClick={() => setMembers((list) => list.filter((item) => item !== id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="add-row" onClick={() => dispatch({ type: "overlay", overlay: "invite" })}>
          <IconPlus /> Add members
        </button>
      </div>
      <Toolbar>
        <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "edit-trip", title, start, end: end || start, members })}>
          Save changes
        </button>
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

export function Tokyo() {
  const { dispatch } = useStore()
  return (
    <div className="page">
      <header className="invite-head">
        <BackButton onClick={() => dispatch({ type: "back" })} />
        <h1>Tokyo</h1>
        <span />
      </header>
      <article className="reserve">
        <h2>11 Nov – 14 Nov, 2026</h2>
        <p>Five more people are in this trip. Planning stays on the list until you open it together.</p>
      </article>
    </div>
  )
}
