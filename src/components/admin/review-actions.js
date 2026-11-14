"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { approveReview, deleteReview, rejectReview, replyToReview } from "@/actions/admin/reviews";
import { AlertCircle, Check } from "@/components/ui/icons";

function Result({ state }) {
  if (!state?.message) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
    >
      {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {state.message}
    </p>
  );
}

/** Publish / hide / reply / delete for one review. */
export function ReviewActions({ review }) {
  const uid = useId();
  const [pending, start] = useTransition();
  const [state, setState] = useState(null);
  const [replying, setReplying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replyState, reply, replyPending] = useActionState(replyToReview, null);
  const run = (fn) =>
    start(async () => {
      setState(await fn(review.id));
    });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {review.status !== "APPROVED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(approveReview)}
            className="btn-ink min-h-10 text-sm"
          >
            Publish
          </button>
        ) : null}
        {review.status !== "REJECTED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(rejectReview)}
            className="btn-outline min-h-10 text-sm"
          >
            {review.status === "APPROVED" ? "Hide" : "Don't publish"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setReplying((v) => !v)}
          aria-expanded={replying}
          aria-controls={`${uid}-reply`}
          className="btn-ghost min-h-10 text-sm"
        >
          {review.adminReply ? "Edit reply" : "Reply"}
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(deleteReview)}
              className="btn-ghost min-h-10 text-sm text-sale"
            >
              Yes, delete it
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost min-h-10 text-sm">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost min-h-10 text-sm text-sale">
            Delete
          </button>
        )}
        <Result state={state} />
      </div>

      {replying ? (
        <form
          id={`${uid}-reply`}
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => reply(fd));
          }}
        >
          <input type="hidden" name="reviewId" value={review.id} />
          <label htmlFor={`${uid}-text`} className="text-[13px] font-bold">
            Reply from the store <span className="font-normal text-fg-muted">· shown under the review</span>
          </label>
          <textarea
            id={`${uid}-text`}
            name="reply"
            rows={3}
            maxLength={1000}
            defaultValue={review.adminReply ?? ""}
            className="w-full rounded-xl border border-field bg-surface px-3 py-2.5 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={replyPending} className="btn-ink min-h-10 text-sm">
              {replyPending ? "Saving…" : "Save reply"}
            </button>
            <span className="text-xs text-fg-muted">Leave it empty to remove the reply.</span>
            <Result state={replyState} />
          </div>
        </form>
      ) : null}
    </div>
  );
}
