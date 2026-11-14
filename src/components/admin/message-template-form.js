"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { resetMessageTemplate, saveMessageTemplate } from "@/actions/admin/messages";
import { Toggle, card } from "@/components/admin/settings-forms";
import { MESSAGE_EVENTS, PLACEHOLDERS, renderTemplate, SAMPLE_NOTES, SAMPLE_VALUES } from "@/lib/message-templates";
import { AlertCircle, Check } from "@/components/ui/icons";

function Result({ state }) {
  const text = state?.message ?? (state?.ok === false ? Object.values(state.errors ?? {})[0] : null);
  if (!text) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
    >
      {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {text}
    </p>
  );
}

/** Edit one message's wording, with a live preview using example values. */
export function MessageTemplateForm({ template, storeName }) {
  const uid = useId();
  const [state, action, pending] = useActionState(saveMessageTemplate, null);
  const [resetState, setResetState] = useState(null);
  const [resetting, startReset] = useTransition();
  const [body, setBody] = useState(template.body);
  const ev = MESSAGE_EVENTS[template.event];
  const preview = renderTemplate(body, {
    ...SAMPLE_VALUES,
    store: storeName,
    note: SAMPLE_NOTES[template.event] ?? "",
  });

  const insert = (key) => {
    const el = document.getElementById(`${uid}-body`);
    const at = el?.selectionStart ?? body.length;
    const next = `${body.slice(0, at)}{${key}}${body.slice(el?.selectionEnd ?? at)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + key.length + 2, at + key.length + 2);
    });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className={card}
      aria-labelledby={`${uid}-t`}
    >
      <input type="hidden" name="event" value={template.event} />
      <h3 id={`${uid}-t`} className="font-extrabold">
        {ev.label}
      </h3>
      <p className="mt-1 text-[13px] text-fg-muted">{ev.hint}</p>

      <div className="mt-4">
        <Toggle
          name="enabled"
          title="Prepare this message"
          description="Off means no message is made for this step."
          defaultChecked={template.enabled}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-body`} className="mb-1.5 block text-[13px] font-bold">
            Message
          </label>
          <textarea
            id={`${uid}-body`}
            name="body"
            rows={11}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby={`${uid}-ph`}
            className="w-full rounded-xl border border-field bg-surface px-3.5 py-3 font-mono text-[13px] leading-relaxed"
          />
          <div id={`${uid}-ph`} className="mt-2">
            <p className="text-xs text-fg-muted">
              Tap to insert. <span className="font-mono">*bold*</span> works in WhatsApp. A line is left out when its
              value is empty (e.g. no tracking number).
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(PLACEHOLDERS).map(([k, hint]) => (
                <li key={k}>
                  <button
                    type="button"
                    title={hint}
                    onClick={() => insert(k)}
                    className="min-h-8 rounded-full border border-line px-2.5 font-mono text-xs hover:border-fg"
                  >
                    {`{${k}}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-bold">Preview</p>
          <div className="rounded-2xl bg-muted p-3">
            <p className="ml-auto max-w-[95%] rounded-xl rounded-tr-sm bg-surface p-3 text-sm [overflow-wrap:anywhere] whitespace-pre-line shadow-sm">
              {preview || <span className="text-fg-muted">Empty message</span>}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-fg-muted">With example order details.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ink min-h-11">
          {pending ? "Saving…" : "Save"}
        </button>
        {template.custom ? (
          <button
            type="button"
            disabled={resetting}
            onClick={() =>
              startReset(async () => {
                const res = await resetMessageTemplate(template.event);
                setResetState(res);
                if (res.ok) window.location.reload();
              })
            }
            className="btn-ghost min-h-11 text-sm"
          >
            Use standard wording
          </button>
        ) : null}
        <Result state={state} />
        <Result state={resetState} />
      </div>
    </form>
  );
}
