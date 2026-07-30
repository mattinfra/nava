import type { CrowdingLevel, CrowdReport } from "@golfolive/shared-types";
import { STATIC_VANTAGE_POINTS } from "./data.js";

// Store in-memory del crowdsourcing (Fase 1, passo 5 di PLAN.md: layer di
// affollamento reale). Un Map basta per l'MVP a singolo processo; se si scala
// su più istanze andrà spostato su Redis (vedi CLAUDE.md §3, stack default).
const crowdingLevels = new Map<string, number>(
  STATIC_VANTAGE_POINTS.map((vp) => [vp.id, vp.crowdingLevel]),
);

const LEVEL_TO_VALUE: Record<CrowdingLevel, number> = {
  low: 0.15,
  medium: 0.45,
  high: 0.8,
};

export function getCrowdingLevel(vantagePointId: string): number | undefined {
  return crowdingLevels.get(vantagePointId);
}

export function isKnownVantagePoint(vantagePointId: string): boolean {
  return crowdingLevels.has(vantagePointId);
}

// Media mobile semplice tra il valore corrente e la nuova segnalazione: uno
// smoothing minimo per non far saltare il ranking a ogni singola segnalazione.
export function reportCrowding(vantagePointId: string, level: CrowdingLevel): CrowdReport {
  const current = crowdingLevels.get(vantagePointId) ?? LEVEL_TO_VALUE[level];
  const next = current * 0.6 + LEVEL_TO_VALUE[level] * 0.4;
  crowdingLevels.set(vantagePointId, next);

  return {
    vantagePointId,
    level,
    reportedAt: new Date().toISOString(),
  };
}

export function currentCrowdingLevels(): Map<string, number> {
  return crowdingLevels;
}
