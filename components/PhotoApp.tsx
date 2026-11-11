"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PhotoDetail } from "@/components/PhotoDetail";
import { PhotoList } from "@/components/PhotoList";
import { PhotoMap } from "@/components/PhotoMap";
import { ThemeSelect } from "@/components/ThemeSelect";
import { UploadForm } from "@/components/UploadForm";
import type { Position } from "@/lib/location";
import { primaryButton } from "@/lib/ui";
import { usePhotos } from "@/lib/use-photos";
import type { User } from "@/lib/users";

// The whole screen. One selectedId is shared by the list, the map and the side panel.
// Phone: map on top, list below. From xl: map on the left, list column on the right.
export function PhotoApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { data, error, addPhoto, changeCommentCount, removePhoto } = usePhotos();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // Where the photo being uploaded would land, drawn as a pin on the map.
  const [draft, setDraft] = useState<Position | null>(null);
  // Looked up, not stored: after a refetch the panel shows the fresh data.
  const selected = data?.find((p) => p.id === selectedId) ?? null;
  const panelRef = useRef<HTMLElement>(null);

  // Below xl the panel sits under the map, often off screen: bring it into view when a
  // photo or the upload form opens. From xl (80rem) it is a column beside the map.
  useEffect(() => {
    if ((selectedId !== null || adding) && !window.matchMedia("(min-width: 80rem)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId, adding]);

  // Escape closes the upload form, or else the photo panel. Ignored while typing in a
  // field, so a half-written comment is never thrown away by accident.
  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select");
    if (event.key !== "Escape" || typing) return;
    if (adding) setAdding(false);
    else setSelectedId(null);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => closeOnEscape(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    // From xl the screen is exactly the window's height and only the side panel scrolls.
    // xl:flex-none: as a flex-1 child of <body>, h-dvh would be ignored and the page would grow instead.
    <div className="flex flex-1 flex-col xl:h-dvh xl:flex-none">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-accent">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          Photo map
        </h1>
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
          <PhotoMap
            photos={data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            draft={adding ? draft : null}
          />
        </section>

        <aside ref={panelRef} className="space-y-3 p-4 xl:overflow-y-auto">
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger">
              {error}
            </p>
          )}
          {data === null ? (
            !error && <p className="text-muted">Loading photos…</p>
          ) : adding ? (
            <UploadForm
              onPositionChange={setDraft}
              onCancel={() => setAdding(false)}
              onUploaded={(photo) => {
                // One render: the new photo is in the list and selected, so the map flies to it.
                addPhoto(photo);
                setAdding(false);
                setSelectedId(photo.id);
              }}
            />
          ) : selected ? (
            // key: another photo gets a fresh panel (blank image, new comment thread), never the old one.
            <PhotoDetail
              key={selected.id}
              photo={selected}
              userEmail={user.email}
              canDelete={selected.uploaderEmail === user.email}
              onClose={() => setSelectedId(null)}
              onCommentAdded={() => changeCommentCount(selected.id, 1)}
              onCommentDeleted={() => changeCommentCount(selected.id, -1)}
              onDeleted={() => {
                removePhoto(selected.id);
                setSelectedId(null);
              }}
            />
          ) : (
            <>
              <button type="button" onClick={() => setAdding(true)} className={`${primaryButton} w-full`}>
                + Add a photo
              </button>
              <PhotoList photos={data} selectedId={selectedId} onSelect={setSelectedId} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
