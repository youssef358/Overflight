"use client";
import { useEffect, useMemo, useState } from "react";
import { resolveLocation, type GpsTags, type Position } from "@/lib/location";
import { MAX_UPLOAD_BYTES, type Photo } from "@/lib/photos";
import { card, input, primaryButton, secondaryButton } from "@/lib/ui";

type Props = {
  onUploaded: (photo: Photo) => void;
  onCancel: () => void;
  // The position that would be sent now (null when there is none), for the pin on the map.
  onPositionChange: (position: Position | null) => void;
};

// An empty field must stay "not a number": Number("") is 0, which is a real latitude.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

const MESSAGES = {
  exif: "Position read from the photo's GPS.",
  manual: "Position typed by hand.",
  no_position: "This photo has no GPS position. Type its latitude and longitude.",
  invalid_position: "Latitude must be between -90 and 90, longitude between -180 and 180, and not 0, 0.",
};

export function UploadForm({ onUploaded, onCancel, onPositionChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [gps, setGps] = useState<GpsTags | null>(null);
  // null: use the photo's GPS. Set as soon as the user edits a coordinate.
  const [typed, setTyped] = useState<{ lat: string; lng: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // The core rule, run on every render: the form always shows what the server will get.
  const location = resolveLocation({
    gps,
    manual: typed && { lat: toNumber(typed.lat), lng: toNumber(typed.lng) },
  });
  // The fields show the photo's GPS only when the rule accepts it: GPS at 0,0 or out of
  // range leaves them empty for the user to type, instead of showing a refused position.
  const fromGps = resolveLocation({ gps });
  const shown = typed ?? (fromGps.ok ? { lat: String(fromGps.lat), lng: String(fromGps.lng) } : { lat: "", lng: "" });
  // Checked here too, so the user does not wait for a 15 MB upload to be refused.
  const tooBig = file !== null && file.size > MAX_UPLOAD_BYTES;

  // A local URL for the chosen file: the preview needs no upload. Revoked when the
  // file changes or the form closes, so the browser can free the memory.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Tell the map where the photo would land; numbers, not the object, so it only runs on a real move.
  const pinLat = location.ok ? location.lat : null;
  const pinLng = location.ok ? location.lng : null;
  useEffect(() => {
    onPositionChange(pinLat === null || pinLng === null ? null : { lat: pinLat, lng: pinLng });
    return () => onPositionChange(null);
  }, [pinLat, pinLng, onPositionChange]);

  async function chooseFile(chosen: File | null) {
    setFile(chosen);
    setGps(null);
    setError(null);
    if (!chosen) return;
    try {
      // Loaded only when needed; reads just the start of the file, where the EXIF block is.
      const { gps: readGps } = await import("exifr");
      setGps((await readGps(chosen)) ?? null);
    } catch {
      setGps(null); // not a readable image: same as a photo without GPS
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !location.ok) return;
    setSending(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("lat", String(location.lat));
    body.append("lng", String(location.lng));
    body.append("locationSource", location.source);
    const res = await fetch("/api/photos", { method: "POST", body }).catch(() => null);
    setSending(false);
    if (res?.status === 201) return onUploaded(await res.json());
    const answer = await res?.json().catch(() => null);
    setError(answer?.error ?? (res ? `Upload failed (HTTP ${res.status})` : "Network error, the photo was not sent."));
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3 p-4`}>
      <h2 className="text-lg font-semibold">Add a photo</h2>
      <input
        type="file"
        accept="image/jpeg"
        aria-label="Photo file"
        onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-surface file:px-3 file:py-1"
      />

      {previewUrl && (
        // A plain <img>: the source is a local blob: URL, nothing for next/image to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="The chosen photo" className="aspect-[3/2] w-full rounded-lg bg-surface object-contain" />
      )}

      {file && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(["lat", "lng"] as const).map((field) => (
              <label key={field} className="text-sm">
                {field === "lat" ? "Latitude" : "Longitude"}
                <input
                  inputMode="decimal"
                  value={shown[field]}
                  onChange={(e) => setTyped({ ...shown, [field]: e.target.value })}
                  className={input}
                />
              </label>
            ))}
          </div>
          <p className={`text-sm ${location.ok ? "text-muted" : "text-danger"}`}>
            {MESSAGES[location.ok ? location.source : location.error]}{" "}
            {typed && gps && (
              <button type="button" onClick={() => setTyped(null)} className="text-accent hover:underline">
                Use the photo&apos;s GPS
              </button>
            )}
          </p>
        </>
      )}

      {(error || tooBig) && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {tooBig ? "This photo is larger than 15 MB." : error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!file || tooBig || !location.ok || sending}
          className={primaryButton}
        >
          {sending ? "Uploading…" : "Upload"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
