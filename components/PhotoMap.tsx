"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { Position } from "@/lib/location";
import type { Photo } from "@/lib/photos";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      // OpenStreetMap has no tiles above zoom 19 (it answers 400). Past 19, MapLibre
      // enlarges the zoom 19 tiles instead of requesting tiles that do not exist.
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// The map tiles are light in both themes, so marker colours are fixed, not theme variables.
const GREY = "#64748b";
const ACCENT = "#2563eb";

// GeoJSON coordinates are [longitude, latitude]: the reverse of how people say them.
function toGeoJSON(points: { lat: number; lng: number; id?: number }[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id },
    })),
  };
}

type Props = {
  photos: Photo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  draft: Position | null; // where the photo being uploaded would land
};

export function PhotoMap({ photos, selectedId, onSelect, draft }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Effect events always see the latest props without re-running the effects that use them.
  const selectFromMap = useEffectEvent((id: number) => onSelect(id));
  const flyToPhoto = useEffectEvent((map: MapLibreMap, id: number) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) map.flyTo({ center: [photo.lng, photo.lat], zoom: Math.max(map.getZoom(), 15) });
  });

  // 1. Create the map once. maplibre-gl needs `window`, so it is imported here, in the browser.
  useEffect(() => {
    let map: MapLibreMap | undefined;
    let cancelled = false;

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      // MapLibre parses tiles in a Web Worker; `npm install` copies it to public/.
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new maplibregl.Map({ container: containerRef.current, style: OSM_STYLE, center: [2.5, 46.6], zoom: 5 });
      map = m;
      m.addControl(new maplibregl.NavigationControl(), "top-right");

      m.on("load", () => {
        m.addSource("photos", { type: "geojson", data: toGeoJSON([]) });
        // Every photo: a small grey circle, drawn by the GPU in one pass.
        m.addLayer({
          id: "photos",
          type: "circle",
          source: "photos",
          paint: { "circle-radius": 6, "circle-color": GREY, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
        });
        // The selected photo only, drawn again on top, bigger and in the accent colour.
        m.addLayer({
          id: "selected",
          type: "circle",
          source: "photos",
          filter: ["==", ["get", "id"], -1],
          paint: { "circle-radius": 9, "circle-color": ACCENT, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" },
        });
        // The photo being uploaded: a hollow accent ring, on top of everything.
        m.addSource("draft", { type: "geojson", data: toGeoJSON([]) });
        m.addLayer({
          id: "draft",
          type: "circle",
          source: "draft",
          paint: { "circle-radius": 9, "circle-color": "#ffffff", "circle-stroke-width": 4, "circle-stroke-color": ACCENT },
        });

        m.on("click", "photos", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "number") selectFromMap(id);
        });
        m.on("mouseenter", "photos", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "photos", () => (m.getCanvas().style.cursor = ""));

        mapRef.current = m;
        setReady(true);
      });
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Push the photos into the existing source; the first time, zoom to fit them all.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("photos") as GeoJSONSource).setData(toGeoJSON(photos));
    if (!fittedRef.current && photos.length > 0) {
      const lngs = photos.map((p) => p.lng);
      const lats = photos.map((p) => p.lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 16, duration: 0 },
      );
      fittedRef.current = true;
    }
  }, [photos, ready]);

  // 3. Highlight the selected photo and fly to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("selected", ["==", ["get", "id"], selectedId ?? -1]);
    if (selectedId !== null) flyToPhoto(map, selectedId);
  }, [selectedId, ready]);

  // 4. Move the draft pin. Pan only when it is out of view, so typing does not shake the map.
  const draftLat = draft?.lat;
  const draftLng = draft?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const pin = draftLat === undefined || draftLng === undefined ? [] : [{ lat: draftLat, lng: draftLng }];
    (map.getSource("draft") as GeoJSONSource).setData(toGeoJSON(pin));
    if (pin.length && !map.getBounds().contains([pin[0].lng, pin[0].lat])) {
      map.easeTo({ center: [pin[0].lng, pin[0].lat] });
    }
  }, [draftLat, draftLng, ready]);

  return <div ref={containerRef} className="h-full w-full" />;
}
