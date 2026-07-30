import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BoatPosition, RankedVantagePoint } from "@golfolive/shared-types";

const GOLFO_DI_NAPOLI_CENTER: [number, number] = [14.235, 40.8175];

const CROWDING_COLOR: Record<RankedVantagePoint["crowdingLabel"], string> = {
  low: "#5fb87c",
  medium: "#e0a83c",
  high: "#c1473b",
};

interface VantagePointMapProps {
  vantagePoints: RankedVantagePoint[];
  boats: BoatPosition[];
  selectedVantagePointId: string | null;
  onSelectVantagePoint: (id: string) => void;
}

// Stile pubblico "demotiles" di MapLibre: nessuna API key, adatto a
// sviluppo/demo. In produzione va sostituito con un provider open (es.
// OpenFreeMap) — vedi CLAUDE.md §3 sul evitare lock-in di soluzioni proprietarie.
const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export function VantagePointMap({
  vantagePoints,
  boats,
  selectedVantagePointId,
  onSelectVantagePoint,
}: VantagePointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vantageMarkersRef = useRef(new Map<string, maplibregl.Marker>());
  const boatMarkersRef = useRef(new Map<string, maplibregl.Marker>());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: GOLFO_DI_NAPOLI_CENTER,
      zoom: 12.5,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set<string>();
    for (const vp of vantagePoints) {
      seenIds.add(vp.id);
      const existing = vantageMarkersRef.current.get(vp.id);
      const el = existing?.getElement() ?? document.createElement("button");
      el.className = "vp-marker";
      el.style.background = CROWDING_COLOR[vp.crowdingLabel];
      el.style.outline = vp.id === selectedVantagePointId ? "2px solid white" : "none";
      el.title = `${vp.name} · punteggio ${vp.score}`;
      el.onclick = () => onSelectVantagePoint(vp.id);

      if (existing) {
        existing.setLngLat([vp.longitude, vp.latitude]);
      } else {
        const marker = new maplibregl.Marker({ element: el }).setLngLat([vp.longitude, vp.latitude]).addTo(map);
        vantageMarkersRef.current.set(vp.id, marker);
      }
    }

    for (const [id, marker] of vantageMarkersRef.current) {
      if (!seenIds.has(id)) {
        marker.remove();
        vantageMarkersRef.current.delete(id);
      }
    }
  }, [vantagePoints, selectedVantagePointId, onSelectVantagePoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set<string>();
    for (const boat of boats) {
      seenIds.add(boat.boatId);
      const existing = boatMarkersRef.current.get(boat.boatId);
      if (existing) {
        existing.setLngLat([boat.longitude, boat.latitude]);
        existing.setRotation(boat.headingDegrees);
      } else {
        const el = document.createElement("div");
        el.className = "boat-marker";
        el.title = boat.boatId;
        const marker = new maplibregl.Marker({ element: el, rotationAlignment: "map" })
          .setLngLat([boat.longitude, boat.latitude])
          .setRotation(boat.headingDegrees)
          .addTo(map);
        boatMarkersRef.current.set(boat.boatId, marker);
      }
    }

    for (const [id, marker] of boatMarkersRef.current) {
      if (!seenIds.has(id)) {
        marker.remove();
        boatMarkersRef.current.delete(id);
      }
    }
  }, [boats]);

  return <div ref={containerRef} className="vp-map" />;
}
