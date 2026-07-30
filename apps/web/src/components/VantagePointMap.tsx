import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BoatPosition, GeoPoint, RankedVantagePoint } from "@golfolive/shared-types";

const GOLFO_DI_NAPOLI_CENTER: [number, number] = [14.235, 40.8175];

const CROWDING_COLOR: Record<RankedVantagePoint["crowdingLabel"], string> = {
  low: "#5fb87c",
  medium: "#e0a83c",
  high: "#c1473b",
};

// Stessa palette per barca del mock (docs/mock/script.js BOATS), giusto per
// coerenza visiva; se un boatId non è tra questi usa un grigio neutro.
const BOAT_COLOR: Record<string, string> = {
  ita1: "#4f8fe0",
  gbr3: "#c1473b",
  nzl2: "#5fb87c",
  usa4: "#e0a83c",
  fra5: "#8fa8a6",
};

// Stile pubblico "demotiles" di MapLibre: nessuna API key, adatto a
// sviluppo/demo. In produzione va sostituito con un provider open (es.
// OpenFreeMap) — vedi CLAUDE.md §3 sul evitare lock-in di soluzioni proprietarie.
const STANDARD_STYLE = "https://demotiles.maplibre.org/style.json";

// Raster satellitare pubblico (Esri World Imagery), usato solo per il
// toggle "satellite" del FAB — nessuna chiave richiesta. Da rivalutare con
// un provider pienamente open se il progetto supera la fase di prototipo.
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri World Imagery",
    },
  },
  layers: [{ id: "esri-satellite", type: "raster", source: "esri-satellite" }],
};

export interface VantagePointMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  flyToUserLocation: (point: GeoPoint) => void;
}

interface VantagePointMapProps {
  vantagePoints: RankedVantagePoint[];
  boats: BoatPosition[];
  mapMode: "points" | "boats";
  selectedVantagePointId: string | null;
  onSelectVantagePoint: (id: string) => void;
  selectedBoatId: string | null;
  onSelectBoat: (id: string) => void;
  layerMode: "standard" | "satellite";
  tilt3d: boolean;
  userPosition: GeoPoint | null;
}

export const VantagePointMap = forwardRef<VantagePointMapHandle, VantagePointMapProps>(
  function VantagePointMap(
    {
      vantagePoints,
      boats,
      mapMode,
      selectedVantagePointId,
      onSelectVantagePoint,
      selectedBoatId,
      onSelectBoat,
      layerMode,
      tilt3d,
      userPosition,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const vantageMarkersRef = useRef(new Map<string, maplibregl.Marker>());
    const boatMarkersRef = useRef(new Map<string, maplibregl.Marker>());
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn: () => mapRef.current?.zoomIn({ duration: 250 }),
      zoomOut: () => mapRef.current?.zoomOut({ duration: 250 }),
      flyToUserLocation: (point) => {
        mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: 15, duration: 800 });
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: STANDARD_STYLE,
        center: GOLFO_DI_NAPOLI_CENTER,
        zoom: 12.5,
      });
      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      mapRef.current?.setStyle(layerMode === "satellite" ? SATELLITE_STYLE : STANDARD_STYLE);
    }, [layerMode]);

    useEffect(() => {
      mapRef.current?.easeTo({ pitch: tilt3d ? 55 : 0, duration: 500 });
    }, [tilt3d]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (!userPosition) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }

      const lngLat: [number, number] = [userPosition.longitude, userPosition.latitude];
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat(lngLat);
      } else {
        const el = document.createElement("div");
        el.className = "user-position-marker";
        userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      }
    }, [userPosition]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const showPoints = mapMode === "points";
      const seenIds = new Set<string>();

      if (showPoints) {
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
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([vp.longitude, vp.latitude])
              .addTo(map);
            vantageMarkersRef.current.set(vp.id, marker);
          }
        }
      }

      for (const [id, marker] of vantageMarkersRef.current) {
        if (!showPoints || !seenIds.has(id)) {
          marker.remove();
          vantageMarkersRef.current.delete(id);
        }
      }
    }, [vantagePoints, mapMode, selectedVantagePointId, onSelectVantagePoint]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const showBoats = mapMode === "boats";
      const seenIds = new Set<string>();

      if (showBoats) {
        for (const boat of boats) {
          seenIds.add(boat.boatId);
          const existing = boatMarkersRef.current.get(boat.boatId);
          const color = BOAT_COLOR[boat.boatId] ?? "#8fa8a6";

          if (existing) {
            existing.setLngLat([boat.longitude, boat.latitude]);
            existing.setRotation(boat.headingDegrees);
          } else {
            const el = document.createElement("div");
            el.className = "boat-marker";
            el.style.borderBottomColor = color;
            el.style.filter =
              boat.boatId === selectedBoatId ? "drop-shadow(0 0 0 2px white)" : "none";
            el.title = boat.boatId;
            el.onclick = () => onSelectBoat(boat.boatId);
            const marker = new maplibregl.Marker({ element: el, rotationAlignment: "map" })
              .setLngLat([boat.longitude, boat.latitude])
              .setRotation(boat.headingDegrees)
              .addTo(map);
            boatMarkersRef.current.set(boat.boatId, marker);
          }
        }
      }

      for (const [id, marker] of boatMarkersRef.current) {
        if (!showBoats || !seenIds.has(id)) {
          marker.remove();
          boatMarkersRef.current.delete(id);
        }
      }
    }, [boats, mapMode, selectedBoatId, onSelectBoat]);

    return <div ref={containerRef} className="vp-map" />;
  },
);
