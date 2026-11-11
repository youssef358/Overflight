"use client";
import { useEffect, useState } from "react";
import type { Photo } from "./photos";

// Fetches GET /api/photos once the component is on screen.
export function usePhotos() {
  const [data, setData] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Abort if the component unmounts first, so a late answer never updates it.
    const controller = new AbortController();
    fetch("/api/photos", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Could not load photos (HTTP ${res.status})`);
        setData(await res.json());
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, []);

  return { data, error };
}
