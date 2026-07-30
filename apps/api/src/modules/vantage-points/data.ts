import type { VantagePoint } from "@golfolive/shared-types";

// Coordinate reali dei punti panoramici del Golfo di Napoli usati come dati
// statici iniziali (Fase 1, passo 1 di PLAN.md). visibilityScore è pre-calcolato
// a mano sulla base della linea di vista verso il campo di regata previsto;
// crowdingLevel parte da un valore stimato e viene poi aggiornato dal
// crowdsourcing (vedi crowd-store.ts).
export const STATIC_VANTAGE_POINTS: VantagePoint[] = [
  {
    id: "castel-ovo",
    name: "Castel dell'Ovo",
    latitude: 40.8288,
    longitude: 14.2469,
    visibilityScore: 0.96,
    crowdingLevel: 0.06,
  },
  {
    id: "posillipo",
    name: "Posillipo — Belvedere",
    latitude: 40.8065,
    longitude: 14.1889,
    visibilityScore: 0.94,
    crowdingLevel: 0.58,
  },
  {
    id: "pizzofalcone",
    name: "Pizzofalcone",
    latitude: 40.8306,
    longitude: 14.2419,
    visibilityScore: 0.8,
    crowdingLevel: 0.1,
  },
  {
    id: "mergellina",
    name: "Mergellina",
    latitude: 40.8225,
    longitude: 14.2119,
    visibilityScore: 0.68,
    crowdingLevel: 0.12,
  },
  {
    id: "lungomare",
    name: "Lungomare Caracciolo",
    latitude: 40.8266,
    longitude: 14.2299,
    visibilityScore: 0.76,
    crowdingLevel: 0.44,
  },
];

// Punto medio del campo di regata previsto (linea di partenza), usato per
// calcolare la distanza dei vantage point dalla rotta — dati simulati finché
// non è disponibile un feed reale di posizione barche (vedi PLAN.md, rischi noti).
export const RACE_COURSE_START = {
  latitude: 40.8175,
  longitude: 14.235,
};
