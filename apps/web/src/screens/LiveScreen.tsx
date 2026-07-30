import { useState } from "react";
import { Icon } from "../components/Icon.js";
import { LIVE_TIMELINE, NEWS, STANDINGS, WIND_KN } from "../data/designPreviewData.js";

type LiveTab = "diretta" | "classifica" | "news";

const TREND_ICON: Record<string, string> = { up: "trend-up", down: "trend-down", flat: "trend-flat" };

interface LiveScreenProps {
  active: boolean;
  onGoToMapBoats: () => void;
}

export function LiveScreen({ active, onGoToMapBoats }: LiveScreenProps) {
  const [tab, setTab] = useState<LiveTab>("diretta");

  return (
    <section className={`screen${active ? " active" : ""}`} data-screen="live">
      <div className="live-scroll">
        <div className="live-hero">
          <span className="phase-pill">Fase 2 — anteprima design · dati simulati</span>
          <span className="live-hero-badge">
            <span className="dot" />
            LIVE
          </span>
          <h1>Regata 4 · Flotta A</h1>
          <p>Percorso costiero, Posillipo → Castel dell&apos;Ovo</p>
          <div className="live-hero-meta">
            <span>
              <Icon name="crowd" />
              3.240 in diretta
            </span>
            <span>
              <Icon name="wind" />
              {WIND_KN} kn · NO
            </span>
          </div>
          <button className="btn-primary live-hero-cta" type="button" onClick={onGoToMapBoats}>
            <Icon name="play" />
            Segui le vele sulla mappa
          </button>
        </div>

        <div className="segmented live-subnav">
          {(["diretta", "classifica", "news"] as const).map((t) => (
            <button
              key={t}
              className={`chip${tab === t ? " active" : ""}`}
              type="button"
              onClick={() => setTab(t)}
            >
              {t === "diretta" ? "Diretta" : t === "classifica" ? "Classifica" : "News"}
            </button>
          ))}
        </div>

        {tab === "diretta" && (
          <div className="live-panel">
            <div className="telemetry-row">
              <div className="telemetry-tile">
                <span className="label">In testa</span>
                <span className="value">ITA 1</span>
              </div>
              <div className="telemetry-tile">
                <span className="label">Prossima boa</span>
                <span className="value">6 min</span>
              </div>
              <div className="telemetry-tile">
                <span className="label">Vento</span>
                <span className="value">14 kn NO</span>
              </div>
              <div className="telemetry-tile">
                <span className="label">Corrente</span>
                <span className="value">0.6 kn</span>
              </div>
            </div>

            <div className="home-section">
              <div className="section-head">
                <h3>Cronaca live</h3>
              </div>
              <div className="timeline">
                {LIVE_TIMELINE.map((item) => (
                  <div className={`timeline-item${item.highlight ? " highlight" : ""}`} key={item.time}>
                    <span className="timeline-dot" />
                    <span className="timeline-body">
                      <span className="timeline-time mono">{item.time}</span>
                      <span className="timeline-text">{item.text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "classifica" && (
          <div className="live-panel">
            <div className="home-section">
              <div className="section-head">
                <h3>
                  <Icon name="trophy" />
                  Classifica Flotta A
                </h3>
              </div>
              <div className="standings-list">
                {STANDINGS.map((s, i) => (
                  <div className={`standing-row${i === 0 ? " leader" : ""}`} key={s.name}>
                    <span className="standing-pos mono">{i + 1}</span>
                    <span className="standing-name">{s.name}</span>
                    <span className="standing-gap mono">{s.gap}</span>
                    <Icon name={TREND_ICON[s.trend]!} className={`standing-trend ${s.trend}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "news" && (
          <div className="live-panel">
            <div className="home-section">
              <div className="section-head">
                <h3>
                  <Icon name="doc" />
                  News
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
          </div>
        )}
      </div>
    </section>
  );
}
