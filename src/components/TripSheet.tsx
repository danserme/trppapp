import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { trips, tripDays, type DayId, type Expense, type Poll, type Stop } from "../data"
import { PEEK, dayStops, isPastDay, person, place, tripRange, useStore } from "../state"
import { FriendsPanel } from "./screens"
import { PassportPanel } from "./Passport"
import { DaySegments, Face, PhotoStack } from "./chrome"
import { ActivityIcon, IconChevron, IconLocate, IconPin, IconPlus } from "./icons"

export function TripDrawer() {
  const { state } = useStore()
  if (state.tab === "friends")
    return (
      <SheetFrame hug view="friends">
        <FriendsPanel />
      </SheetFrame>
    )
  if (state.tab === "passport")
    return (
      <SheetFrame hug view="passport">
        <PassportPanel />
      </SheetFrame>
    )
  if (state.snap === PEEK) return <PeekCard />
  if (state.sheet === "group")
    return (
      <SheetFrame hug view="group">
        <GroupSheet />
      </SheetFrame>
    )
  return (
    <SheetFrame hug={state.tripTab === "docs"} view={`trip-${state.tripTab}`}>
      <TripSheet />
    </SheetFrame>
  )
}

function SheetFrame({ hug = false, view, children }: { hug?: boolean; view: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const frame = ref.current
    const parent = frame?.parentElement
    const content = frame?.firstElementChild as HTMLElement | null
    if (!frame || !parent || !content) return
    const measure = () => {
      const full = parent.clientHeight - 8
      setHeight(hug ? Math.min(content.offsetHeight, full) : full)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    observer.observe(content)
    return () => observer.disconnect()
  }, [hug, view])
  return (
    <div ref={ref} className={hug ? "sheet-frame hug" : "sheet-frame"} style={{ height }}>
      {children}
    </div>
  )
}

function PeekCard() {
  const { dispatch } = useStore()
  return (
    <div className="peek-wrap">
      <button type="button" className="locate peek-locate glass" aria-label="Locate" onClick={() => dispatch({ type: "locate" })}>
        <IconLocate />
      </button>
      <CurrentTripCard />
    </div>
  )
}

export function CurrentTripCard() {
  const { state, dispatch } = useStore()
  return (
    <button type="button" className="peek-card" onClick={() => dispatch({ type: "open-trip" })}>
      <div className="itinerary-intro">
        <header className="trip-head">
          <h1>{state.tripTitle}</h1>
          <span className="head-avatars">
            <PhotoStack kind="header" ids={state.members} extra={1} />
          </span>
        </header>
        <p className="trip-dates">
          <img className="asset" src="/assets/icons/calendar.svg" alt="" /> {tripRange(state.tripStart, state.tripEnd)}
        </p>
      </div>
      <hr className="peek-rule" />
      <div className="peek-progress">
        <div className="peek-progress-labels">
          <span>Day 2 of 4</span>
          <span>2 days left</span>
        </div>
        <DaySegments fills={tripDays("lisbon").map((item) => item.progress)} />
      </div>
      <div className="up-next">
        <small>Up next</small>
        <div>
          <img className="hotel-thumb" src="/assets/hotel-baixa.png" alt="" />
          <span>
            <strong>Hotel Da Baixa</strong>
            <em>22.30–08.00</em>
          </span>
          <IconChevron />
        </div>
      </div>
    </button>
  )
}

type Doc = { id: string; title: string; detail: string; kind: "link" | "file"; overlay?: "reservation" | "ticket" }

const baseDocs: Doc[] = [
  { id: "hotel", title: "Hotel Da Baixa", detail: "Reservation · confirmation HD-2048", kind: "link", overlay: "reservation" },
  { id: "pass", title: "Boarding pass.pdf", detail: "AMS → LIS · 5 Oct 2026", kind: "file", overlay: "ticket" },
]

const tokyoDocs: Doc[] = [
  { id: "tk-hotel", title: "Hotel Gracery Shinjuku", detail: "Reservation · confirmation GS-7731", kind: "link" },
  { id: "tk-pass", title: "Flight AMS → HND.pdf", detail: "KL 861 · 11 Nov 2026", kind: "file" },
]

const tokyo = trips.find((trip) => trip.id === "tokyo")

function useTripHead() {
  const { state } = useStore()
  return state.trip === "tokyo" && tokyo
    ? { title: tokyo.title, dates: tokyo.dates, members: tokyo.people, extra: tokyo.extra + 2 - tokyo.people.length }
    : { title: state.tripTitle, dates: tripRange(state.tripStart, state.tripEnd), members: state.members, extra: 1 }
}

function TripSheet() {
  const { state } = useStore()
  return <TripSheetBody key={state.trip} />
}

function TripSheetBody() {
  const { state, dispatch } = useStore()
  const head = useTripHead()
  const future = state.trip === "tokyo"
  const [docs, setDocs] = useState(future ? tokyoDocs : baseDocs)
  const fileRef = useRef<HTMLInputElement>(null)
  const poll = state.pollByDay[state.day]
  const tab = state.tripTab
  const plans = dayStops(state.day)
  const plansRef = useRef<HTMLDivElement>(null)
  const past = isPastDay(state.day)
  useLayoutEffect(() => {
    const scroller = plansRef.current
    if (!scroller) return
    const current =
      tab === "itinerary"
        ? (scroller.querySelector<HTMLElement>(".card.poll.pending") ??
          (state.day === "tue" ? scroller.querySelector<HTMLElement>(".card.now") : null))
        : null
    if (!current) {
      scroller.scrollTop = 0
      return
    }
    const top = current.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const previous = current.previousElementSibling as HTMLElement | null
    const peek = current.matches(".pending") ? 20 : previous ? previous.offsetHeight * 0.75 + 44 : 0
    scroller.scrollTop = Math.max(0, top - peek)
  }, [state.day, tab, state.snap, poll?.question])
  const gap = past ? undefined : plans.find((stop) => stop.kind === "gap")
  const addLabel = tab === "expenses" ? "Add expense" : tab === "docs" ? "Add document" : "Add to itinerary"

  function add() {
    if (tab === "expenses") dispatch({ type: "overlay", overlay: "bill" })
    else if (tab === "docs") fileRef.current?.click()
    else dispatch({ type: "overlay", overlay: "poll", anchor: gap?.id ?? null, voting: false })
  }

  return (
    <div className={tab === "docs" ? "sheet itinerary hug" : "sheet itinerary"}>
      <span className="handle" />
      <div className="itinerary-col">
        <div className="itinerary-intro">
          <header className="trip-head">
            <h1>{head.title}</h1>
            <button type="button" className="head-avatars" onClick={() => dispatch({ type: "sheet", sheet: "group" })} aria-label="Group">
              <PhotoStack kind="header" ids={head.members} extra={head.extra} />
            </button>
          </header>
          <p className="trip-dates">
            <img className="asset" src="/assets/icons/calendar.svg" alt="" /> {head.dates}
          </p>
        </div>
        <div className="itinerary-main">
          <div className="seg">
            {(["itinerary", "expenses", "docs"] as const).map((item) => (
              <button key={item} type="button" className={tab === item ? "on" : ""} onClick={() => dispatch({ type: "trip-tab", tab: item })}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <div className="day-and-plans">
            {tab === "itinerary" && <DayStrip day={state.day} onPick={(day) => dispatch({ type: "day", day })} />}
            <div className={tab === "docs" ? "plans" : "plans masked"} ref={plansRef} data-vaul-no-drag>
              {tab === "itinerary" && (
                <div className="cards">
                  {poll?.anchorStopId ? (
                    plans.map((stop) => (stop.id === poll.anchorStopId ? <PollCard key="poll" /> : <StopCard key={stop.id} stop={stop} />))
                  ) : (
                    <>
                      {plans.filter((stop) => !stop.afterPoll).map((stop) => (
                        <StopCard key={stop.id} stop={stop} />
                      ))}
                      {poll && <PollCard />}
                      {plans.filter((stop) => stop.afterPoll).map((stop) => (
                        <StopCard key={stop.id} stop={stop} />
                      ))}
                    </>
                  )}
                </div>
              )}
              {tab === "expenses" && (future ? <p className="empty">No expenses yet. Add bills here once the trip starts.</p> : <Expenses />)}
              {tab === "docs" && <Docs docs={docs} />}
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setDocs((current) => [
            ...current,
            { id: `${file.name}-${current.length}`, title: file.name, detail: `Added by you · ${Math.max(1, Math.round(file.size / 1024))} KB`, kind: "file" },
          ])
          dispatch({ type: "toast", toast: "Document added." })
          event.target.value = ""
        }}
      />
      <footer className="sheet-bar">
        <button type="button" className="glass-icon glass" aria-label="Back" onClick={() => dispatch({ type: "back" })}>
          <img className="asset" src="/assets/icons/back.svg" alt="" />
        </button>
        <div className="sheet-actions">
          {tab === "itinerary" && !future && (
            <button type="button" className="glass-icon glass" aria-label="Edit trip" onClick={() => dispatch({ type: "overlay", overlay: "edit" })}>
              <img className="asset" src="/assets/icons/pencil.svg" alt="" />
            </button>
          )}
          {!(tab === "itinerary" && past) && (
            <button type="button" className="add-btn glass" onClick={add}>
              <img className="asset" src="/assets/icons/plus.svg" alt="" /> {addLabel}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

function StopCard({ stop }: { stop: Stop }) {
  const { state, dispatch } = useStore()
  if (stop.kind === "gap") {
    if (isPastDay(state.day)) {
      return (
        <article className="card gap past">
          <div className="gap-head">
            <strong>Free time</strong>
            <span>{stop.time}</span>
          </div>
        </article>
      )
    }
    return (
      <article className="card gap">
        <div className="gap-head">
          <strong>No plans? Let’s fill in the gap!</strong>
          <span>{stop.time}</span>
        </div>
        <div className="gap-actions">
          <button type="button" className="open-poll" onClick={() => dispatch({ type: "overlay", overlay: "poll", anchor: stop.id, voting: true })}>
            <img className="asset" src="/assets/icons/poll-open.svg" alt="" />
            Open poll
          </button>
          <button type="button" onClick={() => dispatch({ type: "overlay", overlay: "poll", anchor: stop.id, voting: false })}>
            <img className="asset" src="/assets/icons/plus.svg" alt="" />
            Add to itinerary
          </button>
        </div>
      </article>
    )
  }
  return (
    <article className={stop.tone === "now" ? "card now" : "card"}>
      <div className="card-meta">
        <span>{stop.time}</span>
        <em>{stop.status}</em>
      </div>
      <div className="card-title">
        <span>
          <ActivityIcon stop={stop} />
          {stop.title}
        </span>
        <PhotoStack kind="card" ids={stop.people} surface="grey" />
      </div>
      {stop.bill && (
        <button type="button" className="add-bill" onClick={() => dispatch({ type: "overlay", overlay: "bill" })}>
          <img src="/assets/icons/plus.svg" alt="" />
          Add bill
        </button>
      )}
    </article>
  )
}

function DayStrip({ day, onPick }: { day: DayId; onPick: (day: DayId) => void }) {
  const { state } = useStore()
  const items = tripDays(state.trip)
  return (
    <div className="days">
      <DaySegments fills={items.map((item) => item.progress)} />
      <div className="day-row">
        {items.map((item) => (
          <button key={item.id} type="button" className={item.id === day ? "day on" : "day"} onClick={() => onPick(item.id)}>
            <small>{item.dow}</small>
            <strong>{item.date}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function winner(poll: Poll) {
  return poll.options.reduce((best, option) => (option.votes.length > best.votes.length ? option : best), poll.options[0])
}

function PollCard() {
  const { state, dispatch } = useStore()
  const poll = state.pollByDay[state.day]
  if (!poll || poll.options.length === 0) return null
  const mine = "ari"
  const ballots = new Set(poll.options.flatMap((option) => option.votes))
  const groupSize = state.members.length + 1
  if (poll.decided || ballots.size >= groupSize) {
    const top = winner(poll)
    const name = place(top.id)?.name ?? top.name ?? "Plan"
    return (
      <StopCard
        stop={{
          id: "poll-result",
          time: `${poll.from}–${poll.to}`,
          tone: "muted",
          status: top.votes.length > 0 ? "voted" : "planned",
          title: name,
          people: top.votes.length > 0 ? top.votes : ["ari"],
          kind: "food",
        }}
      />
    )
  }
  const hasVoted = Boolean(poll.revealed) || poll.options.some((option) => option.votes.includes(mine))
  if (!hasVoted) {
    return (
      <article className="card poll pending">
        <div className="card-meta">
          <span className="poll-when">
            <b>{poll.from}–{poll.to}</b>
            <img className="asset" src="/assets/icons/dot.svg" alt="" />
            <em>poll ongoing</em>
          </span>
          <em className="poll-votes">0 votes</em>
        </div>
        <h3>{poll.question}</h3>
        <div className="poll-options">
          {poll.options.map((option) => {
            const info = place(option.id)
            const name = info?.name ?? option.name ?? "Option"
            return (
              <button key={option.id} type="button" className="poll-choice" onClick={() => dispatch({ type: "vote", optionId: option.id })}>
                <span className="poll-choice-main">
                  {info?.photo ? <img className="poll-thumb" src={info.photo} alt="" /> : <span className="option-ph" />}
                  <span>
                    <strong>{name}</strong>
                    {info?.detail && <em>{info.detail}</em>}
                  </span>
                </span>
                <i className="box" />
              </button>
            )
          })}
        </div>
        <button type="button" className="poll-add" onClick={() => dispatch({ type: "overlay", overlay: "poll", voting: true })}>
          <img className="asset" src="/assets/icons/plus.svg" alt="" />
          Add option
        </button>
      </article>
    )
  }
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0)
  const most = Math.max(...poll.options.map((item) => item.votes.length))
  return (
    <article className="card poll">
      <div className="card-meta">
        <span className="poll-when">
          <b>{poll.from}–{poll.to}</b>
          <img className="asset" src="/assets/icons/dot.svg" alt="" />
          <em>poll ongoing</em>
        </span>
        <em className="poll-votes">
          {ballots.size}/{groupSize} votes
        </em>
      </div>
      <h3>{poll.question}</h3>
      {poll.options.map((option, index) => {
        const info = place(option.id)
        const name = info?.name ?? option.name ?? "Option"
        const pct = totalVotes === 0 ? 0 : Math.round((option.votes.length / totalVotes) * 100)
        const leading = option.votes.length > 0 && option.votes.length === most
        return (
          <button key={option.id} type="button" className="option" onClick={() => dispatch({ type: "vote", optionId: option.id })}>
            {info?.photo ? <img src={info.photo} alt="" /> : <span className="option-ph" />}
            <span className="option-body">
              <span className="option-name">
                <span className={index === 1 ? "" : "light"}>
                  {name} <img className="asset" src="/assets/icons/link.svg" alt="" />
                </span>
                {poll.showVoters && option.votes.length > 0 && (
                  <span className="voters">
                    <b>{option.votes.length}</b>
                    <PhotoStack kind="vote" ids={option.votes} />
                  </span>
                )}
              </span>
              <span className="bar">
                {pct > 0 && (
                  <i className={leading ? "lead" : ""} style={{ width: `${Math.max(pct, 22)}%` }}>
                    <em>
                      {option.votes.includes(mine) && <img className="asset" src="/assets/icons/vote-check.svg" alt="" />}
                      {pct}%
                    </em>
                  </i>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </article>
  )
}

type ExpenseFilter = "all" | "you" | "others"
type ExpenseSort = "recent" | "amount"

const filterLabels: Record<ExpenseFilter, string> = { all: "All expenses", you: "Paid by you", others: "Paid by others" }
const sortLabels: Record<ExpenseSort, string> = { recent: "Most recent", amount: "Highest amount" }

function payer(item: Expense) {
  return item.paidBy === "you" ? "you" : (person(item.paidBy)?.name.split(" ")[0] ?? item.paidBy)
}

function Expenses() {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState<ExpenseFilter>("all")
  const [sort, setSort] = useState<ExpenseSort>("recent")
  const [menu, setMenu] = useState<"filter" | "sort" | null>(null)
  const all = state.expenses
  const total = all.reduce((sum, item) => sum + item.amount, 0)
  const mine = all.filter((item) => item.paidBy === "you").reduce((sum, item) => sum + item.amount, 0)
  const visible = all
    .filter((item) => filter === "all" || (filter === "you" ? item.paidBy === "you" : item.paidBy !== "you"))
    .sort((a, b) => (sort === "amount" ? b.amount - a.amount : b.order - a.order))
  const groups =
    sort === "amount"
      ? [["By amount", visible] as const]
      : Object.entries(
          visible.reduce<Record<string, Expense[]>>((acc, item) => {
            acc[item.day] = [...(acc[item.day] ?? []), item]
            return acc
          }, {}),
        )
  return (
    <div className="expenses">
      <div className="owed">
        <p>You are owed by {state.summary.owedBy.length} people</p>
        <div className="owed-row">
          <strong>{state.summary.owed} €</strong>
          <button type="button" onClick={() => dispatch({ type: "sheet", sheet: "balances" })}>
            Balances <IconChevron />
          </button>
        </div>
        <div className="stats">
          <span>
            <small>Group total</small>
            {total} €
          </span>
          <span>
            <small>Expenses</small>
            {all.length}
          </span>
          <span>
            <small>You paid</small>
            {mine} €
          </span>
        </div>
      </div>
      <div className="expense-head">
        <h3>Expenses</h3>
        <span>
          <button
            type="button"
            aria-label="Filter expenses"
            aria-expanded={menu === "filter"}
            className={filter !== "all" ? "tool on" : "tool"}
            onClick={() => setMenu((open) => (open === "filter" ? null : "filter"))}
          >
            <img className="asset" src="/assets/icons/filter.svg" alt="" />
          </button>
          <button
            type="button"
            aria-label="Sort expenses"
            aria-expanded={menu === "sort"}
            className={sort !== "recent" ? "tool on" : "tool"}
            onClick={() => setMenu((open) => (open === "sort" ? null : "sort"))}
          >
            <img className="asset" src="/assets/icons/sort.svg" alt="" />
          </button>
        </span>
        {menu && (
          <div className="menu" role="menu">
            {(menu === "filter" ? (Object.keys(filterLabels) as ExpenseFilter[]) : (Object.keys(sortLabels) as ExpenseSort[])).map((value) => {
              const on = menu === "filter" ? filter === value : sort === value
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  className={on ? "on" : ""}
                  onClick={() => {
                    if (menu === "filter") setFilter(value as ExpenseFilter)
                    else setSort(value as ExpenseSort)
                    setMenu(null)
                  }}
                >
                  {menu === "filter" ? filterLabels[value as ExpenseFilter] : sortLabels[value as ExpenseSort]}
                  {on && <img className="asset" src="/assets/icons/check.svg" alt="" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {filter !== "all" && (
        <button type="button" className="chip" onClick={() => setFilter("all")}>
          {filterLabels[filter]} <span aria-hidden="true">×</span>
        </button>
      )}
      {groups.length === 0 && <p className="empty">No expenses match this filter.</p>}
      {groups.map(([day, items]) => (
        <section key={day}>
          <div className="expense-day">
            <span>{day}</span>
            <b>{items.reduce((sum, item) => sum + item.amount, 0)} €</b>
          </div>
          {items.map((item) => (
            <div key={item.id} className="expense-row">
              <div className="expense-main">
                <small>paid by {payer(item)}</small>
                <span>
                  <IconPin /> {item.title}
                </span>
              </div>
              <div className="expense-amt">
                <em>split in {item.split}</em>
                <strong>{item.amount} €</strong>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function Docs({ docs }: { docs: Doc[] }) {
  const { dispatch } = useStore()
  return (
    <div className="docs">
      {docs.map((doc) => (
        <button
          key={doc.id}
          type="button"
          className="doc"
          onClick={() => (doc.overlay ? dispatch({ type: "overlay", overlay: doc.overlay }) : dispatch({ type: "toast", toast: `${doc.title} is ready to share.` }))}
        >
          <span className="doc-icon">
            <img className="asset" src={doc.kind === "link" ? "/assets/icons/link-blue.svg" : "/assets/icons/file-blue.svg"} alt="" />
          </span>
          <span className="doc-text">
            <strong>{doc.title}</strong>
            <em>{doc.detail}</em>
          </span>
          <IconChevron dark />
        </button>
      ))}
    </div>
  )
}

function GroupSheet() {
  const { dispatch } = useStore()
  const head = useTripHead()
  return (
    <div className="sheet group">
      <span className="handle" />
      <div className="sheet-scroll">
        <header className="trip-head">
          <h1>{head.title}</h1>
        </header>
        <p className="members-label">Members</p>
        <ul className="member-list">
          {head.members.map((id) => {
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
      <footer className="sheet-bar">
        <button type="button" className="glass-icon glass" aria-label="Back" onClick={() => dispatch({ type: "back" })}>
          <img className="asset" src="/assets/icons/back.svg" alt="" />
        </button>
        <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "overlay", overlay: "invite" })}>
          <IconPlus /> Add members
        </button>
      </footer>
    </div>
  )
}

export function BalancesSheet() {
  const { state, dispatch } = useStore()
  return (
    <div className="sub-layer">
      <button type="button" className="scrim" aria-label="Close balances" onClick={() => dispatch({ type: "back" })} />
      <div className="sub-sheet" role="dialog" aria-label="Balances">
        <span className="handle" />
        <header className="trip-head">
          <h1>Balances</h1>
        </header>
        <p className="members-label">You are owed {state.summary.owed} €</p>
        <ul className="member-list">
          {state.summary.owedBy.map((item) => {
            const who = person(item.id)
            if (!who) return null
            return (
              <li key={item.id}>
                <Face id={item.id} />
                <span>{who.name}</span>
                <b className="owe">{item.amount} €</b>
              </li>
            )
          })}
        </ul>
        <footer className="sheet-bar">
          <button type="button" className="glass-icon glass" aria-label="Back" onClick={() => dispatch({ type: "back" })}>
            <img className="asset" src="/assets/icons/back.svg" alt="" />
          </button>
          <button type="button" className="add-btn glass" onClick={() => dispatch({ type: "toast", toast: "Reminder sent to Ben and Sara." })}>
            Remind them
          </button>
        </footer>
      </div>
    </div>
  )
}
