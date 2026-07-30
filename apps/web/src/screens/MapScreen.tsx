import { useEffect, useMemo, useRef, useState } from "react";
import type { BoatPosition, GeoPoint, RankedVantagePoint } from "@golfolive/shared-types";
import { Icon } from "../components/Icon.js";
import { VantagePointMap, type VantagePointMapHandle } from "../components/VantagePointMap.js";
import { CURRENT_KN, WIND_DEG, WIND_KN } from "../data/designPreviewData.js";
import { bearingDegrees, bearingLabel, crowdLabelText, distanceMeters, formatDistance } from "../utils/geo.js";

type Filter = "all" | "view" | "quiet" | "near";
type MapMode = "points" | "boats";
type CrowdLevel = "low" | "medium" | "high";

interface MapScreenProps {
  active: boolean;
  vantagePoints: RankedVantagePoint[];
  boats: BoatPosition[];
  degraded: boolean;
  raceCourseStart: GeoPoint | null;
  userPosition: GeoPoint | null;
  locationGranted: boolean | null;
  onRequestLocation: () => void;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  pendingDetailId: string | null;
  onDetailOpened: () => void;
  savedVantagePointId: string | null;
  onSaveVantagePoint: (id: string) => void;
  onReportCrowding: (id: string, level: CrowdLevel) => Promise<void>;
}

function hasTag(
  vp: RankedVantagePoint,
  filter: Filter,
  userPosition: GeoPoint | null,
): boolean {
  if (filter === "all") return true;
  if (filter === "view") return vp.factors.visibility >= 85;
  if (filter === "quiet") return vp.crowdingLabel === "low";
  if (filter === "near") return !!userPosition && distanceMeters(userPosition, vp) <= 1500;
  return true;
}

export function MapScreen({
  active,
  vantagePoints,
  boats,
  degraded,
  raceCourseStart,
  userPosition,
  locationGranted,
  onRequestLocation,
  mapMode,
  onMapModeChange,
  pendingDetailId,
  onDetailOpened,
  savedVantagePointId,
  onSaveVantagePoint,
  onReportCrowding,
}: MapScreenProps) {
  const mapRef = useRef<VantagePointMapHandle>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [activeVpId, setActiveVpId] = useState<string | null>(null);
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [layerMode, setLayerMode] = useState<"standard" | "satellite">("standard");
  const [tilt3d, setTilt3d] = useState(false);
  const [forceDegraded, setForceDegraded] = useState(false);
  const [crowdReportConfirm, setCrowdReportConfirm] = useState(false);

  useEffect(() => {
    if (pendingDetailId) {
      setActiveVpId(pendingDetailId);
      onDetailOpened();
    }
  }, [pendingDetailId, onDetailOpened]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vantagePoints
      .filter((vp) => hasTag(vp, activeFilter, userPosition))
      .filter((vp) => !q || vp.name.toLowerCase().includes(q))
      .sort((a, b) => b.score - a.score);
  }, [vantagePoints, activeFilter, searchQuery, userPosition]);

  const rankedBoats = useMemo(() => [...boats].sort((a, b) => b.progress - a.progress), [boats]);
  const leader = rankedBoats[0];

  const activeVp = activeVpId ? vantagePoints.find((vp) => vp.id === activeVpId) ?? null : null;
  const activeBoat = activeBoatId ? boats.find((b) => b.boatId === activeBoatId) ?? null : null;

  function handleFilterClick(filter: Filter) {
    if (filter === "near" && !userPosition) {
      onRequestLocation();
    }
    setActiveFilter(filter);
  }

  function closeDetail() {
    setActiveVpId(null);
    setActiveBoatId(null);
    setCrowdReportConfirm(false);
  }

  function handleModeChange(mode: MapMode) {
    closeDetail();
    onMapModeChange(mode);
  }

  async function handleCrowdReport(level: CrowdLevel) {
    if (!activeVp) return;
    await onReportCrowding(activeVp.id, level);
    setCrowdReportConfirm(true);
  }

  const isDegraded = degraded || forceDegraded;

  return (
    <section className={`screen${active ? " active" : ""}`} data-screen="map">
      <div className={`map-stage${tilt3d ? "" : ""}`} data-tilt={tilt3d ? "1" : "0"}>
        <VantagePointMap
          ref={mapRef}
          vantagePoints={vantagePoints}
          boats={boats}
          mapMode={mapMode}
          selectedVantagePointId={activeVpId}
          onSelectVantagePoint={setActiveVpId}
          selectedBoatId={activeBoatId}
          onSelectBoat={setActiveBoatId}
          layerMode={layerMode}
          tilt3d={tilt3d}
          userPosition={userPosition}
        />
        <div className="map-horizon-fade" aria-hidden="true" />

        <div className="map-overlay-top">
          {mapMode === "points" && (
            <div className="map-search">
              <Icon name="search" />
              <input
                type="text"
                placeholder="Cerca un punto panoramico"
                aria-label="Cerca un punto panoramico"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery.length > 0 && (
                <button
                  className="clear-btn"
                  type="button"
                  aria-label="Cancella ricerca"
                  onClick={() => setSearchQuery("")}
                >
                  <Icon name="close" />
                </button>
              )}
            </div>
          )}

          <div className="segmented segmented-mode">
            <button
              className={`chip${mapMode === "points" ? " active" : ""}`}
              type="button"
              onClick={() => handleModeChange("points")}
            >
              Punti panoramici
            </button>
            <button
              className={`chip${mapMode === "boats" ? " active" : ""}`}
              type="button"
              onClick={() => handleModeChange("boats")}
            >
              Naviga vele
            </button>
          </div>

          {mapMode === "points" && (
            <div className="segmented">
              {(["all", "view", "quiet", "near"] as const).map((filter) => (
                <button
                  key={filter}
                  className={`chip${activeFilter === filter ? " active" : ""}`}
                  type="button"
                  onClick={() => handleFilterClick(filter)}
                >
                  {filter === "all"
                    ? "Tutti"
                    : filter === "view"
                      ? "Miglior visuale"
                      : filter === "quiet"
                        ? "Meno affollati"
                        : "Vicino a te"}
                </button>
              ))}
            </div>
          )}

          {!locationGranted && (
            <div className="geo-banner">
              <Icon name="info" />
              <span>Attiva la posizione per vedere distanza e punti vicino a te.</span>
              <button type="button" onClick={onRequestLocation}>
                Attiva
              </button>
            </div>
          )}

          {isDegraded && (
            <div className="degraded-banner">
              <Icon name="alert" />
              <span>
                <strong>Feed dati non aggiornato</strong>
                Mostriamo l&apos;ultimo stato noto. Punteggi e affollamento possono non riflettere
                la situazione attuale.
              </span>
            </div>
          )}

          <div className="map-chip-row">
            <span className="wind-chip">
              <Icon name="wind" />
              <span>
                {WIND_KN} kn · {bearingLabel(WIND_DEG)}
              </span>
            </span>
            <span className="current-chip">
              <Icon name="current" />
              <span>{CURRENT_KN.toFixed(1)} kn</span>
            </span>
            {mapMode === "boats" && leader && (
              <span className="leader-chip">
                <Icon name="boat" />
                <span>{leader.boatId.toUpperCase()} in testa</span>
              </span>
            )}
          </div>
        </div>

        <div className="map-fabs">
          {mapMode === "boats" && (
            <div className="map-compass" aria-hidden="true">
              <Icon name="compass" />
              <span>N</span>
            </div>
          )}
          <button
            className={`map-fab${layerMode === "satellite" ? " active" : ""}`}
            type="button"
            aria-label="Cambia stile mappa"
            title="Standard / Satellite"
            onClick={() => setLayerMode((m) => (m === "standard" ? "satellite" : "standard"))}
          >
            <Icon name="layers" />
          </button>
          <button
            className={`map-fab${tilt3d ? " active" : ""}`}
            type="button"
            aria-label="Attiva vista 3D"
            title="Vista 3D"
            onClick={() => setTilt3d((v) => !v)}
          >
            <Icon name="cube" />
          </button>
          <button
            className="map-fab zoom-btn"
            type="button"
            aria-label="Zoom avanti"
            title="Zoom avanti"
            onClick={() => mapRef.current?.zoomIn()}
          >
            +
          </button>
          <button
            className="map-fab zoom-btn"
            type="button"
            aria-label="Zoom indietro"
            title="Zoom indietro"
            onClick={() => mapRef.current?.zoomOut()}
          >
            −
          </button>
          <button
            className="map-fab"
            type="button"
            aria-label="Centra sulla mia posizione"
            title="La mia posizione"
            onClick={() => {
              if (!userPosition) {
                onRequestLocation();
                return;
              }
              mapRef.current?.flyToUserLocation(userPosition);
            }}
          >
            <Icon name="locate" />
          </button>
          <button
            className={`map-fab${forceDegraded ? " active" : ""}`}
            type="button"
            aria-label="Simula interruzione feed"
            title="Simula interruzione feed"
            onClick={() => setForceDegraded((v) => !v)}
          >
            <Icon name="alert" />
          </button>
        </div>

        <div className="map-legend-wrap">
          {legendOpen && (
            <div className="map-legend-popover">
              <h4>Dettagli nautici sulla mappa</h4>
              <div className="legend-row">
                <span className="legend-dot-sm" style={{ background: "#5fb87c" }} />
                Bassa affluenza
              </div>
              <div className="legend-row">
                <span className="legend-dot-sm" style={{ background: "#e0a83c" }} />
                Media affluenza
              </div>
              <div className="legend-row">
                <span className="legend-dot-sm" style={{ background: "#c1473b" }} />
                Alta affluenza
              </div>
              <div className="legend-row">
                <span className="legend-dot-sm" style={{ background: "#4f8fe0" }} />
                La tua posizione
              </div>
            </div>
          )}
          <button className="map-legend-btn" type="button" onClick={() => setLegendOpen((v) => !v)}>
            <Icon name="flag" />
            Legenda
          </button>
        </div>
      </div>

      <div className={`vpf-sheet${sheetExpanded ? " expanded" : ""}`}>
        <button
          className="sheet-grabber-row"
          type="button"
          aria-label="Espandi o riduci l'elenco"
          onClick={() => setSheetExpanded((v) => !v)}
        >
          <span className="sheet-grabber" />
        </button>
        <div className="vpf-sheet-head">
          <span className="count mono">
            {mapMode === "points"
              ? `${filteredPoints.length} ${filteredPoints.length === 1 ? "punto" : "punti"}`
              : `${boats.length} barche in regata`}
          </span>
          <button className="btn-ghost" type="button" onClick={() => setSheetExpanded((v) => !v)}>
            {sheetExpanded ? "Mostra meno" : "Mostra tutti"}
          </button>
        </div>

        {mapMode === "points" ? (
          filteredPoints.length === 0 ? (
            <div className="empty-state">
              <div className="icon-wrap">
                <Icon name="search-empty" />
              </div>
              <h3>Nessun punto trovato</h3>
              <p>Nessun risultato per il filtro o la ricerca attuale. Prova a rimuoverli.</p>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
              >
                Azzera filtri
              </button>
            </div>
          ) : (
            <div className="vpf-list">
              {filteredPoints.map((vp) => (
                <button
                  key={vp.id}
                  className={`vp-card${vp.id === savedVantagePointId ? " current" : ""}`}
                  type="button"
                  onClick={() => setActiveVpId(vp.id)}
                >
                  <div className="vp-card-top">
                    <span className="vp-score-ring" style={{ "--pct": vp.score } as React.CSSProperties}>
                      <span>{vp.score}</span>
                    </span>
                    <span className="vp-card-body">
                      <span className="vp-card-name">{vp.name}</span>
                      <span className="vp-card-meta">
                        <span className={`crowd-dot ${vp.crowdingLabel}`} />
                        {userPosition
                          ? `${formatDistance(distanceMeters(userPosition, vp))} da te`
                          : `${formatDistance(vp.distanceToRouteMeters)} dalla rotta`}
                        {" · "}
                        {crowdLabelText(vp.crowdingLabel)}
                      </span>
                    </span>
                  </div>
                  <div className="score-breakdown">
                    <div className="score-factor">
                      <span className="label">Rotta prevista</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${vp.factors.route}%` }} />
                      </span>
                      <span className="val mono">{vp.factors.route}</span>
                    </div>
                    <div className="score-factor">
                      <span className="label">Linea di vista</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${vp.factors.visibility}%` }} />
                      </span>
                      <span className="val mono">{vp.factors.visibility}</span>
                    </div>
                    <div className="score-factor">
                      <span className="label">Affollamento</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${vp.factors.crowding}%` }} />
                      </span>
                      <span className="val mono">{vp.factors.crowding}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="vpf-list">
            {rankedBoats.map((boat, i) => (
              <button
                key={boat.boatId}
                className={`boat-card${i === 0 ? " leader" : ""}`}
                type="button"
                onClick={() => setActiveBoatId(boat.boatId)}
              >
                <span className="boat-pos">{i + 1}</span>
                <span className="boat-card-body">
                  <span className="boat-card-name">{boat.boatId.toUpperCase()}</span>
                  <span className="boat-card-meta">
                    Rotta {bearingLabel(boat.headingDegrees)}
                    {i === 0 ? " · in testa" : ""}
                  </span>
                </span>
                <span className="boat-card-speed">
                  {boat.speedKnots.toFixed(1)} kn<span>velocità</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(activeVp || activeBoat) && (
        <div
          className="vpf-detail-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div className="vpf-detail-sheet">
            <span className="sheet-grabber" />
            {activeVp && (
              <>
                <div className="vpf-detail-head">
                  <span className="vp-score-ring" style={{ "--pct": activeVp.score } as React.CSSProperties}>
                    <span>{activeVp.score}</span>
                  </span>
                  <span>
                    <h2>{activeVp.name}</h2>
                    <span className="meta">
                      {userPosition
                        ? `${formatDistance(distanceMeters(userPosition, activeVp))} da te`
                        : "posizione non attiva"}
                      {" · "}
                      {crowdLabelText(activeVp.crowdingLabel)}
                    </span>
                  </span>
                  <button className="vpf-detail-close" type="button" aria-label="Chiudi dettaglio" onClick={closeDetail}>
                    <Icon name="close" />
                  </button>
                </div>

                <div className="detail-section">
                  <h4>Perché questo punteggio</h4>
                  <div className="score-breakdown">
                    <div className="score-factor">
                      <span className="label">Rotta prevista</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${activeVp.factors.route}%` }} />
                      </span>
                      <span className="val mono">{activeVp.factors.route}</span>
                    </div>
                    <div className="score-factor">
                      <span className="label">Linea di vista</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${activeVp.factors.visibility}%` }} />
                      </span>
                      <span className="val mono">{activeVp.factors.visibility}</span>
                    </div>
                    <div className="score-factor">
                      <span className="label">Affollamento</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${activeVp.factors.crowding}%` }} />
                      </span>
                      <span className="val mono">{activeVp.factors.crowding}</span>
                    </div>
                  </div>
                </div>

                {raceCourseStart && (
                  <div className="detail-section">
                    <h4>Vista sul campo di regata</h4>
                    <div className="route-preview">
                      <span className="bearing-badge">
                        <Icon
                          name="locate"
                          className=""
                        />
                      </span>
                      <span className="text">
                        <b>
                          Linea di partenza verso {bearingLabel(bearingDegrees(activeVp, raceCourseStart))}
                        </b>
                        <span>
                          A {formatDistance(activeVp.distanceToRouteMeters)} dalla rotta prevista
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h4>Segnala quanto è affollato adesso</h4>
                  <div className="crowd-report-row">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        className="crowd-report-btn"
                        type="button"
                        onClick={() => handleCrowdReport(level)}
                      >
                        {level === "low" ? "Poco" : level === "medium" ? "Nella media" : "Molto"}
                      </button>
                    ))}
                  </div>
                  {crowdReportConfirm && (
                    <span className="crowd-report-confirm">Grazie — aggiornato per gli altri spettatori.</span>
                  )}
                </div>

                <div className="detail-actions">
                  <button className="btn-secondary" type="button" disabled title="In roadmap — vedi PLAN.md, backlog di visione">
                    Apri percorso
                  </button>
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => onSaveVantagePoint(activeVp.id)}
                  >
                    {activeVp.id === savedVantagePointId ? "Punto salvato" : "Salva come mio punto"}
                  </button>
                </div>
                <p className="route-note">
                  Il routing verso il punto è nel backlog di visione (PLAN.md) — non ancora nello
                  scope M1.
                </p>
              </>
            )}

            {activeBoat && (
              <>
                <div className="vpf-detail-head">
                  <span
                    className="boat-pos"
                    style={{ width: 44, height: 44, fontSize: "1.02rem" }}
                  >
                    {rankedBoats.findIndex((b) => b.boatId === activeBoat.boatId) + 1}
                  </span>
                  <span>
                    <h2>{activeBoat.boatId.toUpperCase()}</h2>
                    <span className="meta">Posizione simulata</span>
                  </span>
                  <button className="vpf-detail-close" type="button" aria-label="Chiudi dettaglio" onClick={closeDetail}>
                    <Icon name="close" />
                  </button>
                </div>
                <div className="detail-section">
                  <h4>Telemetria live (simulata)</h4>
                  <div className="telemetry-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="telemetry-tile">
                      <span className="label">Velocità</span>
                      <span className="value">{activeBoat.speedKnots.toFixed(1)} kn</span>
                    </div>
                    <div className="telemetry-tile">
                      <span className="label">Rotta</span>
                      <span className="value">{bearingLabel(activeBoat.headingDegrees)}</span>
                    </div>
                    <div className="telemetry-tile">
                      <span className="label">Vento</span>
                      <span className="value">{WIND_KN} kn</span>
                    </div>
                  </div>
                </div>
                <p className="route-note">
                  Posizione e velocità sono simulate — l&apos;ingestion reale delle posizioni
                  barche è nello scope M1/M2 (vedi PLAN.md).
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
