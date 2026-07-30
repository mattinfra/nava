import type {
  CrowdingLevel,
  RankedVantagePoint,
  VantagePoint,
} from "@golfolive/shared-types";
import { RACE_COURSE_START } from "./data.js";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Formula haversine: sufficiente per distanze su scala di golfo, non serve
// la precisione geodetica di un modello ellissoidale completo.
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function crowdingLabel(crowdingLevel: number): CrowdingLevel {
  if (crowdingLevel >= 0.6) return "high";
  if (crowdingLevel >= 0.3) return "medium";
  return "low";
}

// Distanza oltre la quale il punteggio di rotta è considerato nullo: un
// vantage point più lontano di ~6km dalla linea di partenza non è rilevante
// per questa regata, a prescindere da quanto sia panoramico.
const MAX_RELEVANT_DISTANCE_METERS = 6_000;

function routeScore(distance: number): number {
  const normalized = 1 - Math.min(distance, MAX_RELEVANT_DISTANCE_METERS) / MAX_RELEVANT_DISTANCE_METERS;
  return Math.round(normalized * 100);
}

// Pesi coerenti con il mockup di design in docs/mock (rotta 40%, vista 35%,
// affollamento 25%) — vedi CLAUDE.md §1 per la motivazione dei tre fattori.
const WEIGHTS = { route: 0.4, visibility: 0.35, crowding: 0.25 };

export function rankVantagePoints(points: VantagePoint[]): RankedVantagePoint[] {
  return points
    .map((vp) => {
      const distanceToRouteMeters = Math.round(distanceMeters(vp, RACE_COURSE_START));
      const factors = {
        route: routeScore(distanceToRouteMeters),
        visibility: Math.round(vp.visibilityScore * 100),
        crowding: Math.round((1 - vp.crowdingLevel) * 100),
      };
      const score = Math.round(
        factors.route * WEIGHTS.route +
          factors.visibility * WEIGHTS.visibility +
          factors.crowding * WEIGHTS.crowding,
      );

      const ranked: RankedVantagePoint = {
        ...vp,
        score,
        factors,
        crowdingLabel: crowdingLabel(vp.crowdingLevel),
        distanceToRouteMeters,
      };
      return ranked;
    })
    .sort((a, b) => b.score - a.score);
}
