"use client";
import { useState } from "react";
import { PhotoList } from "@/components/PhotoList";
import { PhotoMap } from "@/components/PhotoMap";
import { ThemeSelect } from "@/components/ThemeSelect";
import { usePhotos } from "@/lib/use-photos";

// The whole screen. One selectedId is shared by the list, the map and the side panel.
// Phone: map on top, list below. From xl: map on the left, list column on the right.
export function PhotoApp() {
  const { data, error } = usePhotos();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex flex-1 flex-col xl:h-dvh">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Photo map</h1>
        <ThemeSelect />
      </header>

      <div className="flex flex-1 flex-col xl:grid xl:min-h-0 xl:grid-cols-[1fr_28rem]">
        <section aria-label="Map" className="h-[45vh] border-b xl:h-auto xl:border-r xl:border-b-0">
          <PhotoMap photos={data ?? []} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        <aside className="space-y-3 p-4 xl:overflow-y-auto">
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger">
              {error}
            </p>
          )}
          {data === null ? (
            !error && <p className="text-muted">Loading photos…</p>
          ) : (
            <PhotoList photos={data} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>
      </div>
    </div>
  );
}
