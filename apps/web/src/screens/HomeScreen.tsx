import type { RankedVantagePoint } from "@golfolive/shared-types";
import { Icon } from "../components/Icon.js";
import { FIXTURES, NEWS } from "../data/designPreviewData.js";
import { crowdLabelText, formatDistance } from "../utils/geo.js";

interface HomeScreenProps {
  active: boolean;
  topVantagePoint: RankedVantagePoint | null;
  savedVantagePoint: RankedVantagePoint | null;
  savedVantagePointDistanceMeters: number | null;
  locationGranted: boolean | null;
  onGoToLive: () => void;
  onOpenSavedPoint: (id: string) => void;
}

const FIXTURE_STATUS_LABEL: Record<string, string> = {
  live: "Live",
  upcoming: "A seguire",
  done: "Finita",
};

export function HomeScreen({
  active,
  topVantagePoint,
  savedVantagePoint,
  savedVantagePointDistanceMeters,
  locationGranted,
  onGoToLive,
  onOpenSavedPoint,
}: HomeScreenProps) {
  return (
    <section className={`screen${active ? " active" : ""}`} data-screen="home">
      <div className="home-scroll">
        <h1 className="large-title">
          <small>Oggi al Golfo</small>Ciao.
        </h1>

        <button className="live-strip" type="button" onClick={onGoToLive}>
          <span className="live-strip-dot" />
          <span className="live-strip-body">
            <span className="live-strip-title">In diretta ora · Regata 4, Flotta A</span>
            <span className="live-strip-meta">ITA 1 in testa · boa 1 tra 6 min</span>
          </span>
          <Icon name="chevron-right" className="chev" />
        </button>

        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value mono">{FIXTURES.length}</span>
            <span className="stat-label">Regate oggi</span>
          </div>
          <div className="stat-tile accent">
            <span className="stat-value mono">1</span>
            <span className="stat-label">Live adesso</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value mono">{topVantagePoint ? topVantagePoint.score : "—"}</span>
            <span className="stat-label">Punteggio miglior punto</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value mono">
              {savedVantagePointDistanceMeters !== null ? formatDistance(savedVantagePointDistanceMeters) : "—"}
            </span>
            <span className="stat-label">Punto salvato</span>
          </div>
        </div>

        <div className="home-section">
          <div className="section-head">
            <h3>
              <Icon name="calendar" />
              Programma di oggi
            </h3>
          </div>
          <div className="fixture-list">
            {FIXTURES.map((f) => (
              <div className="fixture-item" key={f.time + f.name}>
                <span className="fixture-time mono">{f.time}</span>
                <span className="fixture-body">
                  <span className="fixture-name">{f.name}</span>
                  <span className="fixture-meta">{f.meta}</span>
                </span>
                <span className={`fixture-status ${f.status}`}>{FIXTURE_STATUS_LABEL[f.status]}</span>
              </div>
            ))}
          </div>
        </div>

        {savedVantagePoint && (
          <div className="home-section">
            <div className="section-head">
              <h3>
                <Icon name="pin" />
                Il tuo punto salvato
              </h3>
            </div>
            <button
              className="saved-point-card"
              type="button"
              onClick={() => onOpenSavedPoint(savedVantagePoint.id)}
            >
              <span className="score-badge">{savedVantagePoint.score}</span>
              <span className="body">
                <span className="title">{savedVantagePoint.name}</span>
                <span className="meta">
                  {savedVantagePointDistanceMeters !== null
                    ? `A ${formatDistance(savedVantagePointDistanceMeters)} da te — `
                    : ""}
                  {crowdLabelText(savedVantagePoint.crowdingLabel)}
                </span>
              </span>
              <Icon name="chevron-right" className="chev" />
            </button>
          </div>
        )}

        {!locationGranted && (
          <div className="home-section">
            <div className="placeholder-note">
              <Icon name="info" />
              <span>
                Posizione non attiva: i punti nella mappa sono ordinati solo per punteggio, non per
                distanza. Puoi attivarla in qualsiasi momento dalla mappa.
              </span>
            </div>
          </div>
        )}

        <div className="home-section">
          <div className="section-head">
            <h3>
              <Icon name="doc" />
              News dal Golfo
            </h3>
          </div>
          <div className="news-list">
            {NEWS.map((n) => (
              <div className="news-card" key={n.title}>
                <span className="news-top">
                  <span className="news-tag">{n.tag}</span>
                  <span className="news-time">{n.time}</span>
                </span>
                <span className="news-title">{n.title}</span>
                <span className="news-snippet">{n.snippet}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="home-section">
          <div className="placeholder-note subtle">
            <Icon name="info" />
            <span>
              Live, classifica e Prediction Game qui sono un&apos;anteprima di design con dati
              simulati — l&apos;implementazione reale segue il Vantage Point Finder (vedi PLAN.md,
              M1 prima di M2).
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
