"use client";
import { formatDate } from "@/lib/format";
import type { Photo } from "@/lib/photos";
import { card } from "@/lib/ui";

type Props = {
  photos: Photo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

// One row per photo. Clicking a row selects it; the map and the side panel follow.
export function PhotoList({ photos, selectedId, onSelect }: Props) {
  if (photos.length === 0) {
    return <p className={`${card} p-4 text-sm text-muted`}>No photos yet. Add the first one.</p>;
  }

  return (
    <ul className={`${card} divide-y overflow-hidden`}>
      {photos.map((p) => {
        const selected = p.id === selectedId;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(p.id)}
              className={`w-full border-l-4 px-3 py-2.5 text-left transition-colors ${
                selected ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{p.originalName}</span>
                <span className="shrink-0 rounded-full border px-2 text-xs text-muted">
                  {p.locationSource === "exif" ? "GPS" : "Placed by hand"}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                <span className="truncate">
                  {p.uploaderEmail} · {formatDate(p.createdAt)}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1" title={`${p.commentCount} comments`}>
                  <CommentIcon />
                  {p.commentCount}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path d="M3 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 4v-4H5a2 2 0 0 1-2-2V4Z" />
    </svg>
  );
}
