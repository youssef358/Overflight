"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection } from "geojson";

// Free OpenStreetMap raster tiles: no API key. Fine for a demo, not for production traffic.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export function PylonMap({ data }: { data: FeatureCollection }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // 1. Create the map once. maplibre-gl needs `window`, so it is imported here,
  //    inside the effect, which only runs in the browser.
  useEffect(() => {
    let map: MapLibreMap | undefined;
    let cancelled = false;

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      // MapLibre v6 parses tiles in a Web Worker. The bundler can't serve it, so
      // `npm install` copies it to public/ (see "postinstall" in package.json).
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [2.32, 48.60], // [lng, lat]
        zoom: 11.5,
      });
      map = m; // so the cleanup below can remove it
      m.addControl(new maplibregl.NavigationControl(), "top-right");

      m.on("load", () => {
        m.addSource("pylons", { type: "geojson", data: EMPTY });
        m.addLayer({
          id: "lines",
          type: "line",
          source: "pylons",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": "#334155", "line-width": 3 },
        });
        m.addLayer({
          id: "points",
          type: "circle",
          source: "pylons",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            // Colour by the `condition` property of each feature.
            "circle-color": ["match", ["get", "condition"], "ok", "#16a34a", "defect", "#dc2626", "#9ca3af"],
          },
        });

        m.on("click", "points", (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          new maplibregl.Popup().setLngLat(e.lngLat).setText(`${props.code}: ${props.condition}`).addTo(m);
        });
        m.on("mouseenter", "points", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "points", () => (m.getCanvas().style.cursor = ""));

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

  // 2. Push new data into the existing source whenever it changes (no map rebuild).
  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("pylons") as GeoJSONSource | undefined)?.setData(data);
  }, [data, ready]);

  return <div ref={containerRef} className="h-[420px] w-full rounded-lg border border-slate-200" />;
}
