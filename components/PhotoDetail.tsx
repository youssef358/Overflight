"use client";
import { useState } from "react";
import { Comments } from "@/components/Comments";
import { formatDate } from "@/lib/format";
import type { Photo } from "@/lib/photos";
import { dangerButton } from "@/lib/ui";

type Props = {
  photo: Photo;
  userEmail: string;
  // Only for the uploader's own photos. The API checks it again: this only hides the button.
  canDelete: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
  onDeleted: () => void;
};

const SOURCE_LABEL = { exif: "from the photo's GPS", manual: "placed by hand" } as const;

// The side panel for the selected photo: the image, who took it, where and when.
export function PhotoDetail({ photo, userEmail, canDelete, onClose, onCommentAdded, onCommentDeleted, onDeleted }: Props) {
  const fileUrl = `/api/photos/${photo.id}/file`;
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deletePhoto() {
    const comments = photo.commentCount === 1 ? " and its comment" : photo.commentCount ? ` and its ${photo.commentCount} comments` : "";
    if (!window.confirm(`Delete ${photo.originalName}${comments}? This cannot be undone.`)) return;
    const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.status === 204) return onDeleted();
    const answer = await res?.json().catch(() => null);
    setDeleteError(answer?.error ?? "Network error, the photo was not deleted.");
  }

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
            <dt className="text-muted">Description (AI)</dt>
            <dd>{photo.description}</dd>
          </>
        )}
      </dl>

      <div className="flex items-center justify-between gap-3">
        <a href={fileUrl} target="_blank" rel="noopener" className="text-sm text-accent hover:underline">
          Open full size
        </a>
        {canDelete && (
          <button type="button" onClick={deletePhoto} className={dangerButton}>
            Delete photo
          </button>
        )}
      </div>
      {deleteError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{deleteError}</p>}

      <Comments photoId={photo.id} userEmail={userEmail} onAdded={onCommentAdded} onDeleted={onCommentDeleted} />
    </article>
  );
}
