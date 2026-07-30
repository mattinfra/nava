import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { fetchBoats, fetchVantagePoints, reportCrowding } from "./api/client.js";
import { AppTabbar, type AppPanel } from "./components/AppTabbar.js";
import { IconSprite } from "./components/IconSprite.js";
import { usePolledResource } from "./hooks/usePolledResource.js";
import { GameScreen } from "./screens/GameScreen.js";
import { GateScreen } from "./screens/GateScreen.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { LiveScreen } from "./screens/LiveScreen.js";
import { MapScreen } from "./screens/MapScreen.js";
import { distanceMeters } from "./utils/geo.js";
import type { GeoPoint } from "@golfolive/shared-types";

const POLL_INTERVAL_MS = 5000;
const SAVED_VANTAGE_POINT_KEY = "golfolive.savedVantagePointId";

type Theme = "auto" | "dark" | "light";
type MapMode = "points" | "boats";

export function App() {
  const [gateCompleted, setGateCompleted] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [userPosition, setUserPosition] = useState<GeoPoint | null>(null);
  const [theme, setTheme] = useState<Theme>("auto");
  const [panel, setPanel] = useState<AppPanel>("home");
  const [mapMode, setMapMode] = useState<MapMode>("points");
  const [pendingDetailId, setPendingDetailId] = useState<string | null>(null);
  const [savedVantagePointId, setSavedVantagePointId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(SAVED_VANTAGE_POINT_KEY),
  );

  useEffect(() => {
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const vantagePointsResource = usePolledResource(fetchVantagePoints, POLL_INTERVAL_MS);
  const boatsResource = usePolledResource(fetchBoats, POLL_INTERVAL_MS);

  const vantagePoints = vantagePointsResource.data?.vantagePoints ?? [];
  const raceCourseStart = vantagePointsResource.data?.raceCourseStart ?? null;
  const boats = boatsResource.data?.boats ?? [];
  const degraded = vantagePointsResource.degraded || boatsResource.degraded;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationGranted(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationGranted(true);
      },
      () => setLocationGranted(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  function handleSkipLocation() {
    setLocationGranted(false);
    setGateCompleted(true);
  }

  function handleGrantLocation() {
    requestLocation();
    setGateCompleted(true);
  }

  function handleSaveVantagePoint(id: string) {
    setSavedVantagePointId(id);
    window.localStorage.setItem(SAVED_VANTAGE_POINT_KEY, id);
  }

  function goToMapDetail(id: string) {
    setMapMode("points");
    setPendingDetailId(id);
    setPanel("map");
  }

  function goToMapBoats() {
    setMapMode("boats");
    setPanel("map");
  }

  async function handleReportCrowding(id: string, level: "low" | "medium" | "high") {
    await reportCrowding(id, level);
  }

  const topVantagePoint = vantagePoints[0] ?? null;
  const savedVantagePoint = savedVantagePointId
    ? (vantagePoints.find((vp) => vp.id === savedVantagePointId) ?? null)
    : null;
  const savedVantagePointDistanceMeters =
    savedVantagePoint && userPosition ? distanceMeters(userPosition, savedVantagePoint) : null;

  function cycleTheme() {
    setTheme((current) => (current === "auto" ? "dark" : current === "dark" ? "light" : "auto"));
  }

  if (!gateCompleted) {
    return (
      <main className="app-shell">
        <IconSprite />
        <div className="app-body">
          <GateScreen onGrantLocation={handleGrantLocation} onSkipLocation={handleSkipLocation} />
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <IconSprite />
      <header className="app-topbar">
        <span className="wordmark">
          GolfoLive<span>.</span>
        </span>
        <button className="theme-toggle" type="button" onClick={cycleTheme}>
          TEMA · {theme.toUpperCase()}
        </button>
      </header>

      <div className="app-body">
        <HomeScreen
          active={panel === "home"}
          topVantagePoint={topVantagePoint}
          savedVantagePoint={savedVantagePoint}
          savedVantagePointDistanceMeters={savedVantagePointDistanceMeters}
          locationGranted={locationGranted}
          onGoToLive={() => setPanel("live")}
          onOpenSavedPoint={goToMapDetail}
        />
        <LiveScreen active={panel === "live"} onGoToMapBoats={goToMapBoats} />
        <MapScreen
          active={panel === "map"}
          vantagePoints={vantagePoints}
          boats={boats}
          degraded={degraded}
          raceCourseStart={raceCourseStart}
          userPosition={userPosition}
          locationGranted={locationGranted}
          onRequestLocation={requestLocation}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          pendingDetailId={pendingDetailId}
          onDetailOpened={() => setPendingDetailId(null)}
          savedVantagePointId={savedVantagePointId}
          onSaveVantagePoint={handleSaveVantagePoint}
          onReportCrowding={handleReportCrowding}
        />
        <GameScreen active={panel === "game"} />
      </div>

      <AppTabbar active={panel} onChange={setPanel} />
    </main>
  );
}
