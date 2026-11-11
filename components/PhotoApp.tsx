"use client";
import { useState } from "react";
import { PhotoDetail } from "@/components/PhotoDetail";
import { PhotoList } from "@/components/PhotoList";
import { PhotoMap } from "@/components/PhotoMap";
import { ThemeSelect } from "@/components/ThemeSelect";
import { UploadForm } from "@/components/UploadForm";
import { usePhotos } from "@/lib/use-photos";
import type { User } from "@/lib/users";

// The whole screen. One selectedId is shared by the list, the map and the side panel.
// Phone: map on top, list below. From xl: map on the left, list column on the right.
export function PhotoApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { data, error, addPhoto } = usePhotos();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // Looked up, not stored: after a refetch the panel shows the fresh data.
  const selected = data?.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 flex-col xl:h-dvh">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Photo map</h1>
        <div className="flex items-center gap-3">
          {/* Hidden on phones: the header has no room for a long email at 375 px. */}
          <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
          <button type="button" onClick={onLogout} className="text-sm text-accent hover:underline">
            Log out
          </button>
          <ThemeSelect />
        </div>
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
          ) : adding ? (
            <UploadForm
              onCancel={() => setAdding(false)}
              onUploaded={(photo) => {
                // One render: the new photo is in the list and selected, so the map flies to it.
                addPhoto(photo);
                setAdding(false);
                setSelectedId(photo.id);
              }}
            />
          ) : selected ? (
            <PhotoDetail photo={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background"
              >
                Add a photo
              </button>
              <PhotoList photos={data} selectedId={selectedId} onSelect={setSelectedId} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
