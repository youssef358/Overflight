"use client";
import { useEffect, useState } from "react";
import type { Pylon, PylonFilters } from "./pylons";

// Fetches /api/pylons with the given filters. Bump `version` to force a refetch
// (for example after a PATCH).
export function usePylons(filters: PylonFilters, version: number) {
  const [data, setData] = useState<Pylon[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  useEffect(() => {
    // Abort the old request if filters change before it answers,
    // so a slow old response can never overwrite a newer one.
    const controller = new AbortController();
    fetch(`/api/pylons?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API answered ${res.status}`);
        setData(await res.json());
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [query, version]);

  return { data, error };
}
