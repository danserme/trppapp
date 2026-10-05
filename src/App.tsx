import { useEffect, useMemo, useRef, useState } from "react"
import { Drawer } from "vaul"
import { MapView, type MapFocus, type MapHighlight } from "./components/MapView"
import { HomeScreen } from "./components/HomeScreen"
import {
  BillScreen,
  EditTrip,
  NewTrip,
  InviteScreen,
  PollComposer,
  ReservationScreen,
  SearchScreen,
  StyleScreen,
  TicketScreen,
  TripList,
} from "./components/screens"
import { BalancesSheet, TripDrawer } from "./components/TripSheet"
import { StampGallery, StampViewer } from "./components/Passport"
import { Onboarding } from "./components/Onboarding"
import { StatusBar, TabBar, Toast } from "./components/chrome"
import { IconList, IconSliders } from "./components/icons"
import { trips } from "./data"
import { MID, OPEN, PASS, PEEK, TALL, TODAY, Provider, useStore } from "./state"

const SNAPS = [PEEK, MID, OPEN, TALL]
const PASSPORT_SNAPS = [PEEK, MID, PASS, TALL]

const PHONE_W = 402
const PHONE_H = 874
const BEZEL = 14

function useScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => {
      const next = Math.min(
        1,
        (window.innerWidth - 48) / (PHONE_W + BEZEL * 2),
        (window.innerHeight - 48) / (PHONE_H + BEZEL * 2),
      )
      setScale(Number.isFinite(next) && next > 0 ? next : 1)
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])
  return scale
}

// While a drag is under way vaul moves the drawer but its height stays at the last snap point, so dragging up would
// lift the sheet's bottom edge off the screen. Watch the drawer's transform and stretch the sheet by the same amount.
function useStretchOnDrag(content: HTMLElement | null, snapPx: number) {
  const base = useRef(snapPx)
  useEffect(() => {
    base.current = snapPx
  }, [snapPx])
  useEffect(() => {
    const fill = content?.querySelector<HTMLElement>(".drawer-fill")
    if (!content || !fill) return
    const sync = () => {
      const dragging = content.style.transition === "none"
      const y = new DOMMatrix(getComputedStyle(content).transform).m42
      const lift = dragging ? Math.max(0, content.clientHeight - base.current - y) : 0
      if (lift > 0) {
        fill.style.setProperty("--lift", `${lift}px`)
        fill.dataset.lifting = ""
      } else if ("lifting" in fill.dataset) {
        fill.style.removeProperty("--lift")
        delete fill.dataset.lifting
      }
    }
    const observer = new MutationObserver(sync)
    observer.observe(content, { attributes: true, attributeFilter: ["style"] })
    return () => observer.disconnect()
  }, [content])
}

function Shell() {
  const scale = useScale()
  useEffect(() => {
    document.documentElement.dataset.mode = "shell"
  }, [])
  return (
    <div className="stage">
      <div
        className="device"
        style={{
          width: (PHONE_W + BEZEL * 2) * scale,
          height: (PHONE_H + BEZEL * 2) * scale,
          padding: BEZEL * scale,
          borderRadius: 64 * scale,
        }}
      >
        <div className="device-screen" style={{ borderRadius: 50 * scale }}>
          <iframe
            title="TripUp on iPhone 17"
            src={`${location.pathname}?app=1`}
            style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  )
}

function Phone() {
  const { state, dispatch, screen, setScreen } = useStore()
  const [yearsOpen, setYearsOpen] = useState(false)
  const [tripsInView, setTripsInView] = useState(0)
  const [drawer, setDrawer] = useState<HTMLDivElement | null>(null)
  const removed = useMemo(() => ({ stops: state.removedStops, trips: state.removedTrips }), [state.removedStops, state.removedTrips])
  const showMap = state.mode === "map"
  const drawerExpanded = state.tab !== "trips" || state.snap !== PEEK
  const showChrome = showMap && state.tab === "trips" && state.snap === PEEK
  const onPassport = showMap && state.tab === "passport" && !state.stamp && state.snap !== TALL
  const showYears = onPassport || (showChrome && (tripsInView > 1 || state.year !== "all"))
  const fullPage =
    state.overlay === "invite" ||
    state.overlay === "bill" ||
    state.overlay === "poll" ||
    state.overlay === "ticket" ||
    state.overlay === "reservation" ||
    state.overlay === "search" ||
    state.overlay === "edit" ||
    state.overlay === "new-trip" ||
    state.gallery
  const showTabs = !fullPage && !(state.tab === "trips" && state.mode === "map" && state.snap !== PEEK)
  const snapPx = screen ? screen.clientHeight * state.snap : 318
  useStretchOnDrag(drawer, snapPx)
  const focus: MapFocus =
    state.tab === "passport"
      ? state.stamp
        ? `stamp:${state.stamp}`
        : "globe"
      : state.tab !== "trips" || state.snap === PEEK
        ? "trip"
        : state.trip !== "lisbon"
          ? `away:${state.trip}`
          : state.sheet !== "group" && state.tripTab === "itinerary" && state.day !== TODAY
          ? state.day
          : "now"

  const dayView = state.tab === "trips" && state.snap !== PEEK && state.sheet !== "group" && state.tripTab === "itinerary"
  const lit = dayView && (state.trip !== "lisbon" || state.day !== TODAY)
  const highlight = useMemo<MapHighlight>(() => (lit ? { trip: state.trip, day: state.day } : null), [lit, state.trip, state.day])
  const peekTop = PHONE_H - 400
  const sheetTop = state.tab === "trips" && state.snap === PEEK ? peekTop : PHONE_H - snapPx
  const camera = state.tab === "friends" ? { focus: "trip" as const, highlight: null, sheetTop: peekTop } : { focus, highlight, sheetTop }

  useEffect(() => {
    document.documentElement.dataset.mode = "app"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "back" })
    }
    // vaul 1.1.2 drops modal={false}, so its Radix focus trap listens on document and pulls focus back into the drawer.
    const shieldFocus = (event: FocusEvent) => event.stopPropagation()
    window.addEventListener("keydown", onKey)
    document.body.addEventListener("focusin", shieldFocus)
    document.body.addEventListener("focusout", shieldFocus)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.removeEventListener("focusin", shieldFocus)
      document.body.removeEventListener("focusout", shieldFocus)
    }
  }, [dispatch])

  if (!state.launched) {
    return (
      <div className="screen home-screen">
        <HomeScreen />
      </div>
    )
  }

  if (state.onboarding) {
    return (
      <div className="screen launched">
        <Onboarding onDone={() => dispatch({ type: "onboarded" })} />
      </div>
    )
  }

  return (
    <div className="screen launched" ref={setScreen}>
      {showMap && (
        <MapView
          palette={state.palette}
          locateTick={state.locateTick}
          year={state.year}
          sheetTop={camera.sheetTop}
          focus={camera.focus}
          highlight={camera.highlight}
          spot={state.tab === "trips" && state.snap !== PEEK ? (state.focusStop?.coord ?? null) : null}
          removed={removed}
          onInteract={() => {
            if (state.tab === "passport") return
            if (state.tab === "friends") {
              dispatch({ type: "tab", tab: "trips" })
              dispatch({ type: "snap", snap: PEEK })
            }
            setYearsOpen(false)
          }}
          onStamp={(id) => dispatch({ type: "stamp", id })}
          onTrip={(trip, day, stop) => {
            dispatch({ type: "open-trip", trip })
            if (day) dispatch({ type: "day", day })
            if (stop) dispatch({ type: "focus-stop", ...stop })
            setYearsOpen(false)
          }}
          onTripsInView={setTripsInView}
          onAlreadyHere={() => dispatch({ type: "toast", toast: "You’re already looking at your location." })}
        />
      )}
      <StatusBar onOpenTrip={() => dispatch({ type: "open-trip", trip: "lisbon" })} />
      {showYears && (
        <button type="button" className="map-btn left glass" aria-label="Years" aria-expanded={yearsOpen} onClick={() => setYearsOpen((open) => !open)}>
          <IconSliders />
        </button>
      )}
      {showYears && yearsOpen && (
        <div className="year-filters glass">
          {(["All", 2025, 2026, 2027] as const).map((year) => {
            const value = year === "All" ? "all" : year
            return (
              <button
                key={year}
                type="button"
                className={state.year === value ? "on" : ""}
                onClick={() => {
                  dispatch({ type: "year", year: value })
                  setYearsOpen(false)
                }}
              >
                {year}
              </button>
            )
          })}
        </div>
      )}
      {showChrome && (
        <button type="button" className="map-btn right glass" aria-label="Show trips as list" onClick={() => dispatch({ type: "mode", mode: "list" })}>
          <IconList />
        </button>
      )}
      {state.tab === "trips" && state.mode === "list" && <TripList />}

      {showMap && screen && !state.stamp && (
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          noBodyStyles
          disablePreventScroll
          autoFocus={false}
          container={screen}
          snapPoints={state.tab === "passport" ? PASSPORT_SNAPS : SNAPS}
          snapToSequentialPoint
          activeSnapPoint={state.snap}
          setActiveSnapPoint={(snap) => {
            const next = typeof snap === "number" ? snap : PEEK
            if (next === PEEK && state.tab !== "trips") {
              dispatch({ type: "tab", tab: "trips" })
              return
            }
            dispatch({ type: "snap", snap: next })
          }}
        >
          <Drawer.Portal>
            <Drawer.Content ref={setDrawer} className="trip-drawer" aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()}>
              <Drawer.Title className="sr">{state.tab === "friends" ? "Friends" : state.tab === "passport" ? "Passport" : state.trip === "lisbon" ? state.tripTitle : trips.find((trip) => trip.id === state.trip)?.title}</Drawer.Title>
              <div className={drawerExpanded ? "drawer-fill open" : "drawer-fill"} style={{ height: `calc(${snapPx}px + var(--lift, 0px))` }}>
                <TripDrawer />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      {state.overlay === "invite" && <InviteScreen />}
      {state.overlay === "poll" && <PollComposer />}
      {state.overlay === "bill" && <BillScreen />}
      {state.overlay === "ticket" && <TicketScreen />}
      {state.overlay === "reservation" && <ReservationScreen />}
      {state.overlay === "search" && <SearchScreen />}
      {state.overlay === "edit" && <EditTrip />}
      {state.overlay === "new-trip" && <NewTrip />}
      {state.overlay === "style" && <StyleScreen />}
      {state.stamp && !state.gallery && <StampViewer />}
      {state.stamp && state.gallery && <StampGallery />}
      {state.sheet === "balances" && state.tab === "trips" && state.snap !== PEEK && <BalancesSheet />}
      <Toast text={state.toast} tone={state.toastTone} />
      {showTabs && (
        <TabBar
          tab={state.tab}
          onTab={(tab) => dispatch({ type: "tab", tab })}
          onAdd={() => dispatch({ type: "overlay", overlay: "new-trip" })}
        />
      )}
    </div>
  )
}

export default function App() {
  const isApp = new URLSearchParams(location.search).has("app")
  if (!isApp) return <Shell />
  return (
    <Provider>
      <Phone />
    </Provider>
  )
}
