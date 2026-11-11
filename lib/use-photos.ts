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

  // POST /api/photos answers with the complete new photo (same shape as the list),
  // so it is added at the top instead of reloading every photo.
  function addPhoto(photo: Photo) {
    setData((current) => [photo, ...(current ?? [])]);
  }

  // After a new comment: keep the list's "N comments" right without reloading every photo.
  function incrementCommentCount(photoId: number) {
    setData((current) =>
      (current ?? []).map((p) => (p.id === photoId ? { ...p, commentCount: p.commentCount + 1 } : p)),
    );
  }

  // After a 204 from DELETE: drop it from the list (and so from the map).
  function removePhoto(photoId: number) {
    setData((current) => (current ?? []).filter((p) => p.id !== photoId));
  }

  return { data, error, addPhoto, incrementCommentCount, removePhoto };
}
