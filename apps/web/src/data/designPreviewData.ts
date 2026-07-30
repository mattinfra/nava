// Dati statici di anteprima design per le schermate Home/Live/Gioco, portati
// da docs/mock/script.js. NON sono dati reali: Live e Prediction Game sono
// M2, fuori scope finché M1 (Vantage Point Finder) non ha un MVP stabile
// (vedi PLAN.md, CLAUDE.md §8). Nessuna integrazione con dati ufficiali dei
// team di vela (PLAN.md, "Esplicitamente fuori scope").

export interface Fixture {
  time: string;
  name: string;
  meta: string;
  status: "live" | "upcoming" | "done";
}

export const FIXTURES: Fixture[] = [
  { time: "16:40", name: "Regata 4 · Flotta A", meta: "Costiera, Posillipo → Castel dell'Ovo", status: "live" },
  { time: "18:10", name: "Regata 5 · Flotta A", meta: "Bolina/poppa, campo al largo", status: "upcoming" },
  { time: "14:05", name: "Regata 3 · Flotta A", meta: "Vinta da GBR 3", status: "done" },
];

export interface NewsItem {
  tag: string;
  time: string;
  title: string;
  snippet: string;
}

export const NEWS: NewsItem[] = [
  {
    tag: "Regata",
    time: "12 min fa",
    title: "ITA 1 passa in testa alla prima boa",
    snippet: "Virata pulita all'ingresso del layline: guadagnati due lunghezze su GBR 3.",
  },
  {
    tag: "Meteo",
    time: "48 min fa",
    title: "Vento in rotazione a Nord-Ovest nel pomeriggio",
    snippet: "Previsto un rinforzo fino a 16 nodi entro le 18:00, possibile ritardo per la Regata 5.",
  },
  {
    tag: "Percorso",
    time: "Ieri",
    title: "Confermato il campo di regata costiero",
    snippet: "Linea di partenza davanti al Lungomare Caracciolo, percorso verso Castel dell'Ovo.",
  },
];

export interface TimelineItem {
  time: string;
  text: string;
  highlight?: boolean;
}

export const LIVE_TIMELINE: TimelineItem[] = [
  { time: "16:40", text: "Partenza: flotta al completo, linea pulita." },
  { time: "16:47", text: "ITA 1 e GBR 3 si separano sui due lati del campo." },
  { time: "16:53", text: "ITA 1 vira per prima e passa in testa alla boa 1.", highlight: true },
  { time: "16:58", text: "NZL 2 recupera terreno nel lato sinistro del campo." },
];

export interface Standing {
  name: string;
  gap: string;
  trend: "up" | "down" | "flat";
}

export const STANDINGS: Standing[] = [
  { name: "ITA 1", gap: "In testa", trend: "up" },
  { name: "GBR 3", gap: "+4s", trend: "down" },
  { name: "NZL 2", gap: "+11s", trend: "up" },
  { name: "USA 4", gap: "+18s", trend: "flat" },
  { name: "FRA 5", gap: "+26s", trend: "down" },
  { name: "SUI 6", gap: "+31s", trend: "flat" },
];

export const GAME_QUESTION = {
  text: "Chi vira per primo verso la Boa 2?",
  options: ["ITA 1", "GBR 3", "NZL 2"],
  points: 50,
  closesInSec: 48,
};

export const GAME_STATS = { score: 1240, rank: 4, streak: 3 };

export interface LeaderboardEntry {
  name: string;
  points: number;
  you?: boolean;
}

export const GAME_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Marco V.", points: 1810 },
  { name: "Giulia R.", points: 1620 },
  { name: "Luca P.", points: 1455 },
  { name: "Tu", points: 1240, you: true },
  { name: "Sara D.", points: 1190 },
  { name: "Andrea F.", points: 980 },
];

export interface GameHistoryItem {
  time: string;
  text: string;
  correct: boolean;
  points: string;
}

export const GAME_HISTORY: GameHistoryItem[] = [
  { time: "16:53", text: "In testa alla Boa 1: hai previsto ITA 1", correct: true, points: "+40" },
  { time: "16:40", text: "Chi vira per primo: hai previsto GBR 3", correct: false, points: "+0" },
  { time: "Ieri", text: "In testa al traguardo: hai previsto NZL 2", correct: true, points: "+60" },
];

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Vento/corrente stimati mostrati sulla mappa VPF: nessun feed meteo reale
// nello scope M1 — valori illustrativi coerenti col mock.
export const WIND_KN = 14;
export const WIND_DEG = 315;
export const CURRENT_KN = 0.6;
