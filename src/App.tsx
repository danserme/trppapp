import { useEffect, useState } from "react"
import { Drawer } from "vaul"
import { MapView, type MapFocus } from "./components/MapView"
import { HomeScreen } from "./components/HomeScreen"
import {
  BillScreen,
  EditTrip,
  InviteScreen,
  PollComposer,
  ReservationScreen,
  SearchScreen,
  StyleScreen,
  TicketScreen,
  Tokyo,
  TripList,
} from "./components/screens"
import { BalancesSheet, TripDrawer } from "./components/TripSheet"
import { StampGallery, StampViewer } from "./components/Passport"
import { StatusBar, TabBar, Toast } from "./components/chrome"
import { IconMap, IconSliders } from "./components/icons"
import { MID, OPEN, PEEK, TALL, TODAY, Provider, useStore } from "./state"

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
            onLoad={(event) => event.currentTarget.contentWindow?.focus()}
            onMouseEnter={(event) => event.currentTarget.contentWindow?.focus()}
          />
        </div>
      </div>
    </div>
  )
}

function Phone() {
  const { state, dispatch, screen, setScreen } = useStore()
  const [yearsOpen, setYearsOpen] = useState(false)
  const showMap = state.mode === "map"
  const drawerExpanded = state.tab !== "trips" || state.snap !== PEEK
  const showChrome = showMap && state.tab === "trips" && state.snap === PEEK
  const fullPage =
    state.overlay === "invite" ||
    state.overlay === "bill" ||
    state.overlay === "poll" ||
    state.overlay === "ticket" ||
    state.overlay === "reservation" ||
    state.overlay === "search" ||
    state.overlay === "edit" ||
    state.overlay === "tokyo" ||
    state.gallery
  const showTabs = !fullPage && !(state.tab === "trips" && state.mode === "map" && state.snap !== PEEK)
  const snapPx = screen ? Math.round(screen.clientHeight * state.snap) : 318
  const focus: MapFocus =
    state.tab === "passport"
      ? state.stamp
        ? `stamp:${state.stamp}`
        : "globe"
      : state.tab !== "trips" || state.snap === PEEK
        ? "trip"
        : state.trip === "tokyo"
          ? "tokyo"
          : state.sheet !== "group" && state.tripTab === "itinerary" && state.day !== TODAY
          ? state.day
          : "now"

  useEffect(() => {
    document.documentElement.dataset.mode = "app"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "back" })
    }
    const claimFocus = (event: PointerEvent) => {
      if (!document.hasFocus()) window.focus()
      const field = (event.target as HTMLElement).closest<HTMLElement>("input:not([type=time]), textarea")
      if (field && document.activeElement !== field) window.setTimeout(() => field.focus(), 0)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", claimFocus, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", claimFocus, true)
    }
  }, [dispatch])

  if (!state.launched) {
    return (
      <div className="screen home-screen">
        <HomeScreen />
      </div>
    )
  }

  return (
    <div className="screen launched" ref={setScreen}>
      {showMap && (
        <MapView
          palette={state.palette}
          locateTick={state.locateTick}
          showRoute={state.year === "all" || state.year === 2026}
          sheetTop={state.tab === "trips" && state.snap === PEEK ? PHONE_H - 400 : PHONE_H - snapPx}
          focus={focus}
          onInteract={() => {
            if (state.tab === "passport") return
            if (state.tab !== "trips" || state.snap !== PEEK) {
              dispatch({ type: "tab", tab: "trips" })
              dispatch({ type: "snap", snap: PEEK })
            }
            setYearsOpen(false)
          }}
          onStamp={(id) => dispatch({ type: "stamp", id })}
        />
      )}
      <StatusBar />
      {showChrome && (
        <>
          <button type="button" className="map-btn left glass" aria-label="Years" aria-expanded={yearsOpen} onClick={() => setYearsOpen((open) => !open)}>
            <IconSliders />
          </button>
          {yearsOpen && (
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
          <button type="button" className="map-btn right glass" aria-label="Show trips as list" onClick={() => dispatch({ type: "mode", mode: "list" })}>
            <IconMap />
          </button>
        </>
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
          snapPoints={[PEEK, MID, OPEN, TALL]}
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
            <Drawer.Content className="trip-drawer" aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()}>
              <Drawer.Title className="sr">{state.tab === "friends" ? "Friends" : state.tab === "passport" ? "Passport" : state.trip === "tokyo" ? "Tokyo" : state.tripTitle}</Drawer.Title>
              <div className={drawerExpanded ? "drawer-fill open" : "drawer-fill"} style={{ height: snapPx }}>
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
      {state.overlay === "tokyo" && <Tokyo />}
      {state.overlay === "style" && <StyleScreen />}
      {state.stamp && !state.gallery && <StampViewer />}
      {state.stamp && state.gallery && <StampGallery />}
      {state.sheet === "balances" && state.tab === "trips" && state.snap !== PEEK && <BalancesSheet />}
      <Toast text={state.toast} tone={state.toastTone} />
      {showTabs && (
        <TabBar
          tab={state.tab}
          onTab={(tab) => dispatch({ type: "tab", tab })}
          onSearch={() => dispatch({ type: "overlay", overlay: "search" })}
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
