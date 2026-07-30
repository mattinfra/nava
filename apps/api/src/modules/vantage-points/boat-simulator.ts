import type { BoatPosition } from "@golfolive/shared-types";

// Generatore di posizioni barche simulate (PLAN.md Fase 1, passo 2): finché
// non c'è un feed reale, un anello percorso ciclicamente attorno al campo di
// regata basta a validare l'architettura di ranking e aggiornamento realtime.
const COURSE_LOOP: Array<{ latitude: number; longitude: number }> = [
  { latitude: 40.8155, longitude: 14.2405 }, // partenza
  { latitude: 40.822, longitude: 14.234 },
  { latitude: 40.829, longitude: 14.228 }, // boa di bolina
  { latitude: 40.8235, longitude: 14.2315 },
  { latitude: 40.818, longitude: 14.237 }, // cancello sottovento
  { latitude: 40.8155, longitude: 14.2405 }, // ritorno a partenza
];

const SIMULATED_BOATS = [
  { boatId: "ita1", lapDurationMs: 90_000, phase: 0 },
  { boatId: "gbr3", lapDurationMs: 94_000, phase: 0.08 },
  { boatId: "nzl2", lapDurationMs: 92_000, phase: 0.16 },
  { boatId: "usa4", lapDurationMs: 98_000, phase: 0.24 },
  { boatId: "fra5", lapDurationMs: 100_000, phase: 0.3 },
] as const;

function loopSegmentLengths(): number[] {
  const lengths: number[] = [];
  for (let i = 0; i < COURSE_LOOP.length - 1; i++) {
    const a = COURSE_LOOP[i]!;
    const b = COURSE_LOOP[i + 1]!;
    lengths.push(Math.hypot(b.latitude - a.latitude, b.longitude - a.longitude));
  }
  return lengths;
}

const SEGMENT_LENGTHS = loopSegmentLengths();
const LOOP_LENGTH = SEGMENT_LENGTHS.reduce((sum, len) => sum + len, 0);

function pointOnLoop(progress: number): { latitude: number; longitude: number; headingDegrees: number } {
  const t = ((progress % 1) + 1) % 1;
  const target = t * LOOP_LENGTH;

  let accumulated = 0;
  for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
    const segmentLength = SEGMENT_LENGTHS[i]!;
    if (accumulated + segmentLength >= target || i === SEGMENT_LENGTHS.length - 1) {
      const a = COURSE_LOOP[i]!;
      const b = COURSE_LOOP[i + 1]!;
      const segmentT = segmentLength === 0 ? 0 : (target - accumulated) / segmentLength;
      const dLat = b.latitude - a.latitude;
      const dLon = b.longitude - a.longitude;
      const headingDegrees = (Math.atan2(dLon, dLat) * 180) / Math.PI;
      return {
        latitude: a.latitude + dLat * segmentT,
        longitude: a.longitude + dLon * segmentT,
        headingDegrees: (headingDegrees + 360) % 360,
      };
    }
    accumulated += segmentLength;
  }

  const first = COURSE_LOOP[0]!;
  return { latitude: first.latitude, longitude: first.longitude, headingDegrees: 0 };
}

export function getSimulatedBoatPositions(now: number = Date.now()): BoatPosition[] {
  const timestamp = new Date(now).toISOString();
  return SIMULATED_BOATS.map(({ boatId, lapDurationMs, phase }) => {
    const progress = phase + now / lapDurationMs;
    const { latitude, longitude, headingDegrees } = pointOnLoop(progress);
    return { boatId, latitude, longitude, headingDegrees, timestamp };
  });
}
