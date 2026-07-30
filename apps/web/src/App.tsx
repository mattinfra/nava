import { useState } from "react";
import "./App.css";
import { fetchBoats, fetchVantagePoints, reportCrowding } from "./api/client.js";
import { usePolledResource } from "./hooks/usePolledResource.js";
import { VantagePointMap } from "./components/VantagePointMap.js";

const POLL_INTERVAL_MS = 5000;

export function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vantagePointsResource = usePolledResource(fetchVantagePoints, POLL_INTERVAL_MS);
  const boatsResource = usePolledResource(fetchBoats, POLL_INTERVAL_MS);

  const vantagePoints = vantagePointsResource.data?.vantagePoints ?? [];
  const boats = boatsResource.data?.boats ?? [];
  const degraded = vantagePointsResource.degraded || boatsResource.degraded;

  async function handleReportCrowding(vantagePointId: string, level: "low" | "medium" | "high") {
    try {
      await reportCrowding(vantagePointId, level);
    } catch {
      // La segnalazione è opportunistica: se fallisce, il prossimo poll
      // riproverà comunque a leggere lo stato aggiornato, niente da bloccare.
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>GolfoLive — Vantage Point Finder</h1>
      </header>
      {degraded && (
        <div className="degraded-banner">
          Feed dati non raggiungibile: mostro l&apos;ultimo stato noto.
        </div>
      )}
      <div className="app-body">
        <VantagePointMap
          vantagePoints={vantagePoints}
          boats={boats}
          selectedVantagePointId={selectedId}
          onSelectVantagePoint={setSelectedId}
        />
        <aside className="vp-sidebar">
          <h2>Punti panoramici ({vantagePoints.length})</h2>
          {vantagePoints.map((vp) => (
            <button
              key={vp.id}
              type="button"
              className={`vp-card${vp.id === selectedId ? " selected" : ""}`}
              onClick={() => setSelectedId(vp.id)}
            >
              <div className="vp-card-top">
                <span>{vp.name}</span>
                <span>{vp.score}</span>
              </div>
              <div className="vp-card-meta">
                {(vp.distanceToRouteMeters / 1000).toFixed(1)} km dalla rotta ·{" "}
                {vp.crowdingLabel === "low"
                  ? "bassa affluenza"
                  : vp.crowdingLabel === "medium"
                    ? "media affluenza"
                    : "alta affluenza"}
              </div>
              {vp.id === selectedId && (
                <div className="crowd-report-row" onClick={(e) => e.stopPropagation()}>
                  {(["low", "medium", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleReportCrowding(vp.id, level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </button>
          ))}
        </aside>
      </div>
    </main>
  );
}
