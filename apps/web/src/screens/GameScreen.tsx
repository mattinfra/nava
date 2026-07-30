import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon.js";
import {
  GAME_HISTORY,
  GAME_LEADERBOARD,
  GAME_QUESTION,
  GAME_STATS,
  initials,
} from "../data/designPreviewData.js";

interface GameScreenProps {
  active: boolean;
}

function formatTimer(secondsLeft: number): string {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Anteprima di design (M2): interfaccia statica, nessuna validazione reale.
// La protezione anti-bot/anti-cheat server-side resta un requisito non
// negoziabile dal primo prototipo funzionante (CLAUDE.md §6) — non
// implementata qui perché questo pannello non è ancora M2 reale.
export function GameScreen({ active }: GameScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(GAME_QUESTION.closesInSec);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0 || lockedRef.current) return prev;
        const next = prev - 1;
        if (next === 0) lockedRef.current = true;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  function handleSelect(option: string) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setSelectedOption(option);
  }

  const locked = lockedRef.current;

  return (
    <section className={`screen${active ? " active" : ""}`} data-screen="game">
      <div className="live-scroll">
        <div className="game-hero">
          <span className="phase-pill">Fase 2 — anteprima design · dati simulati</span>
          <h1>Prediction Game</h1>
          <p>Previsioni tattiche sulla Regata 4, Flotta A — indovina e scala la classifica.</p>

          <div className="predict-card">
            <div className="predict-card-head">
              <span className="predict-question">{GAME_QUESTION.text}</span>
              <span className="predict-timer">
                <Icon name="clock" />
                <span>{secondsLeft > 0 ? formatTimer(secondsLeft) : "Chiusa"}</span>
              </span>
            </div>
            <div className={`predict-options${locked ? " locked" : ""}`}>
              {GAME_QUESTION.options.map((opt) => (
                <button
                  key={opt}
                  className={`predict-option${selectedOption === opt ? " selected" : ""}`}
                  type="button"
                  onClick={() => handleSelect(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="predict-foot">
              <span className="predict-points">
                +<span>{GAME_QUESTION.points}</span> punti se indovini
              </span>
              {selectedOption && <span className="predict-confirm">Previsione registrata</span>}
            </div>
          </div>
        </div>

        <div className="live-panel">
          <div className="stat-grid">
            <div className="stat-tile accent">
              <span className="stat-value mono">{GAME_STATS.score.toLocaleString("it-IT")}</span>
              <span className="stat-label">Il tuo punteggio</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value mono">#{GAME_STATS.rank}</span>
              <span className="stat-label">Posizione in classifica</span>
            </div>
          </div>

          <div className="home-section">
            <div className="section-head">
              <h3>
                <Icon name="trophy" />
                Classifica giocatori
              </h3>
            </div>
            <div className="standings-list">
              {GAME_LEADERBOARD.map((p, i) => (
                <div className={`standing-row${p.you ? " you" : ""}`} key={p.name}>
                  <span className="standing-pos mono">{i + 1}</span>
                  <span className="standing-avatar">{initials(p.name)}</span>
                  <span className="standing-name">{p.name}</span>
                  <span className="standing-gap mono">{p.points.toLocaleString("it-IT")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="home-section">
            <div className="section-head">
              <h3>Le tue ultime previsioni</h3>
            </div>
            <div className="timeline">
              {GAME_HISTORY.map((item) => (
                <div className="timeline-item" key={item.time + item.text}>
                  <span className={`timeline-dot ${item.correct ? "correct" : "wrong"}`} />
                  <span className="timeline-body">
                    <span className="timeline-time mono">{item.time}</span>
                    <span className="timeline-text">{item.text}</span>
                  </span>
                  <span className={`timeline-points ${item.correct ? "correct" : "wrong"}`}>{item.points}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="home-section">
            <div className="placeholder-note subtle">
              <Icon name="shield" />
              <span>
                Anteprima di design: la validazione server-side delle previsioni e la protezione
                anti-bot/anti-cheat sono un requisito non negoziabile dal primo prototipo
                funzionante (CLAUDE.md §6) — non ancora implementate qui, che è solo interfaccia
                statica.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
