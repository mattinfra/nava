import type { BoatPosition, GeoPoint, RankedVantagePoint } from "@golfolive/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} responded with ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchVantagePoints(): Promise<{
  vantagePoints: RankedVantagePoint[];
  raceCourseStart: GeoPoint;
}> {
  return getJson("/vantage-points");
}

export function fetchBoats(): Promise<{ boats: BoatPosition[] }> {
  return getJson("/boats");
}

export function reportCrowding(
  vantagePointId: string,
  level: "low" | "medium" | "high",
): Promise<Response> {
  return fetch(`${API_BASE_URL}/vantage-points/${vantagePointId}/crowd-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level }),
  });
}
