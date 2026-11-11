"use client";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { useComments } from "@/lib/use-comments";

type Props = { photoId: number; onAdded: () => void };

// The comment thread under a photo, and the form to add one.
export function Comments({ photoId, onAdded }: Props) {
  const { data, error, addComment } = useComments(photoId);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setSendError(null);
    const res = await fetch(`/api/photos/${photoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    const answer = await res?.json().catch(() => null);
    setSending(false);
    if (res?.status === 201) {
      addComment(answer);
      onAdded();
      setBody("");
      return;
    }
    setSendError(answer?.error ?? "Network error, the comment was not sent.");
  }

  return (
    <section aria-label="Comments" className="space-y-3 border-t pt-3">
      <h3 className="font-semibold">Comments</h3>

      {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {data === null ? (
        !error && <p className="text-sm text-muted">Loading comments…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-lg bg-surface p-2 text-sm">
              <p className="text-xs text-muted">
                {c.authorEmail} · {formatDate(c.createdAt)}
              </p>
              {/* Plain text: React escapes it, so a comment can never run as HTML. */}
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <label className="block text-sm">
          Add a comment
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            className="mt-1 block w-full rounded-md border bg-background px-2 py-1"
          />
        </label>
        {sendError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{sendError}</p>}
        <button
          type="submit"
          disabled={sending || body.trim() === ""}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {sending ? "Posting…" : "Post"}
        </button>
      </form>
    </section>
  );
}
