"use client";
import type { Photo } from "@/lib/photos";

type Props = {
  photos: Photo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

// One row per photo. Clicking a row selects it; the map and the side panel follow.
export function PhotoList({ photos, selectedId, onSelect }: Props) {
  if (photos.length === 0) {
    return <p className="text-muted">No photos yet. Upload the first one.</p>;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {photos.map((p) => {
        const selected = p.id === selectedId;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(p.id)}
              className={`w-full px-3 py-2 text-left ${selected ? "bg-accent-soft" : "hover:bg-surface"}`}
            >
              <span className="block truncate font-medium">{p.originalName}</span>
              <span className="block text-sm text-muted">
                {p.uploaderEmail} · {dateFormat.format(new Date(p.createdAt))} ·{" "}
                {p.commentCount} {p.commentCount === 1 ? "comment" : "comments"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
