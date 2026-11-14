"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { submitReview } from "@/actions/reviews";
import { AlertCircle, Star } from "@/components/ui/icons";

const WORDS = ["", "Poor", "Not great", "OK", "Good", "Love them"];
const FITS = [
  ["SMALL", "Runs small"],
  ["TRUE", "True to size"],
  ["LARGE", "Runs large"],
];
const field = "w-full rounded-xl border border-field bg-surface px-3.5 text-[15px] aria-invalid:border-sale";
const choice =
  "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold has-checked:border-fg has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring";

/** Star rating, fit, title and text. `initial` is the customer's earlier review, if any. */
export function ReviewForm({ productId, initial }) {
  const uid = useId();
  const [state, action, pending] = useActionState(submitReview, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const formRef = useRef(null);
  const shown = hover || rating;

  useEffect(() => {
    if (state?.ok !== false) return;
    const target = formRef.current?.querySelector('[role="alert"], [aria-invalid="true"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${uid}-${k}-err` } : {});
  const errText = (k) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-sale">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {errors[k]}
      </p>
    ) : null;

  return (
    <form
      ref={formRef}
      noValidate
      className="grid gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      {state?.message ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm font-semibold text-sale">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-3 text-lg font-extrabold">Your rating</legend>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                onMouseEnter={() => setHover(n)}
                className="grid size-12 cursor-pointer place-items-center rounded-lg has-focus-visible:outline-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                  {...err("rating")}
                />
                <span className="sr-only">
                  {n} {n === 1 ? "star" : "stars"}, {WORDS[n]}
                </span>
                <Star
                  filled={n <= shown}
                  className={`size-8 transition-colors ${n <= shown ? "text-saffron" : "text-fg-muted"}`}
                />
              </label>
            ))}
          </div>
          <span aria-hidden="true" className="text-sm font-semibold text-fg-muted">
            {WORDS[shown]}
          </span>
        </div>
        {errText("rating")}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-extrabold">
          How do they fit? <span className="text-sm font-normal text-fg-muted">· optional</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {FITS.map(([value, text]) => (
            <label key={value} className={choice}>
              <input
                type="radio"
                name="fit"
                value={value}
                defaultChecked={initial?.fit === value}
                className="sr-only"
              />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-title`} className="mb-2 block text-lg font-extrabold">
          Headline <span className="text-sm font-normal text-fg-muted">· optional</span>
        </label>
        <input
          id={`${uid}-title`}
          name="title"
          maxLength={150}
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. Comfortable all day"
          className={`${field} min-h-12`}
          {...err("title")}
        />
        {errText("title")}
      </div>

      <div>
        <label htmlFor={`${uid}-body`} className="mb-2 block text-lg font-extrabold">
          Your review
        </label>
        <textarea
          id={`${uid}-body`}
          name="body"
          rows={5}
          maxLength={3000}
          defaultValue={initial?.body ?? ""}
          placeholder="Comfort, quality, colour, how they look on…"
          className={`${field} py-3`}
          {...err("body")}
        />
        {errText("body")}
      </div>

      <div>
        <button type="submit" disabled={pending} className="btn-primary min-h-12 px-8">
          {pending ? "Sending…" : initial ? "Update review" : "Post review"}
        </button>
        <p className="mt-2 text-[13px] text-fg-muted">
          Your first name is shown with your review. Please don&apos;t include phone numbers or addresses.
        </p>
      </div>
    </form>
  );
}
