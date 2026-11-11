"use client";
import { useEffect, useState } from "react";
import type { Comment } from "./comments";

// Fetches GET /api/photos/:id/comments for one photo.
export function useComments(photoId: number) {
  const [data, setData] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Abort if the user switches photo first, so an old answer never shows under the new photo.
    const controller = new AbortController();
    fetch(`/api/photos/${photoId}/comments`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Could not load comments (HTTP ${res.status})`);
        setData(await res.json());
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [photoId]);

  // POST answers with the complete new comment, so it is added at the end (oldest first).
  function addComment(comment: Comment) {
    setData((current) => [...(current ?? []), comment]);
  }

  return { data, error, addComment };
}
