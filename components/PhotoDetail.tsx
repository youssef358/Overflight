"use client";
import { Comments } from "@/components/Comments";
import { formatDate } from "@/lib/format";
import type { Photo } from "@/lib/photos";

type Props = { photo: Photo; onClose: () => void; onCommentAdded: () => void };

const SOURCE_LABEL = { exif: "from the photo's GPS", manual: "placed by hand" } as const;

// The side panel for the selected photo: the image, who took it, where and when.
export function PhotoDetail({ photo, onClose, onCommentAdded }: Props) {
  const fileUrl = `/api/photos/${photo.id}/file`;

  return (
    <article className="space-y-3">
      <button type="button" onClick={onClose} className="text-sm text-accent hover:underline">
        ← All photos
      </button>

      {/* A plain <img>: next/image would fetch the file from the server without the user's login cookie. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl}
        alt={photo.originalName}
        decoding="async"
        className="aspect-[3/2] w-full rounded-lg bg-surface object-contain"
      />

      <div>
        <h2 className="truncate text-lg font-semibold">{photo.originalName}</h2>
        <p className="text-sm text-muted">
          {photo.uploaderEmail} · {formatDate(photo.createdAt)}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Position</dt>
        <dd>
          {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}{" "}
          <span className="text-muted">({SOURCE_LABEL[photo.locationSource]})</span>
        </dd>
        {photo.description && (
          <>
            <dt className="text-muted">Description</dt>
            <dd>{photo.description}</dd>
          </>
        )}
      </dl>

      <a href={fileUrl} target="_blank" rel="noopener" className="inline-block text-sm text-accent hover:underline">
        Open full size
      </a>

      <Comments photoId={photo.id} onAdded={onCommentAdded} />
    </article>
  );
}
