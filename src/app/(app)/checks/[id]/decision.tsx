"use client";

/**
 * The supervisor's decision. Two choices as plain radio buttons and a
 * reason that is always required: an override with no reason is not one.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideCheck } from "@/app/actions";

export function Decision({ id, held, nextHref }: { id: string; held: boolean; nextHref: string | null }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"approved" | "returned" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const options = [
    {
      value: "approved" as const,
      title: held ? "Override and approve" : "Accept",
      body: held
        ? "The registration goes ahead with the VIN's details. Say what you checked."
        : "The fields entered by hand stand. Say what you checked.",
    },
    {
      value: "returned" as const,
      title: "Return to the clerk",
      body: "The registration does not go ahead today. Say what the customer needs to bring.",
    },
  ];

  return (
    <form
      className={`rounded-[8px] border-[3px] bg-card p-4 sm:p-5 ${held ? "border-stop" : "border-flag-edge"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!outcome) return setError("Choose approve or return.");
        start(async () => {
          const r = await decideCheck(id, outcome, reason);
          if (!r.ok) return setError(r.error);
          router.push(nextHref ?? "/queue");
          router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="text-[1.15rem] font-bold">{held ? "Supervisor override" : "Supervisor review"}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-3 rounded-[6px] border-2 p-3 ${
                outcome === o.value ? "border-ink bg-canvas" : "border-rule-strong"
              }`}
            >
              <input
                type="radio"
                name="outcome"
                value={o.value}
                checked={outcome === o.value}
                onChange={() => setOutcome(o.value)}
                className="mt-1 size-5 shrink-0 accent-[#0e1116]"
              />
              <span>
                <span className="block font-bold">{o.title}</span>
                <span className="block text-[0.9rem] text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-2 block font-bold">Reason</span>
        <textarea
          className="field h-28 py-3"
          value={reason}
          maxLength={1000}
          required
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      <p role="alert" className="mt-3 min-h-[1.5rem] font-bold text-stop">
        {error}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="submit" className={`btn ${outcome === "returned" ? "btn-stop" : "btn-act"} min-w-[12rem]`} disabled={pending}>
          {pending ? "Saving…" : outcome === "returned" ? "Return to the clerk" : held ? "Record the override" : "Record the decision"}
        </button>
        <span className="text-[0.85rem] text-muted">
          <span className="kbd">Ctrl + Enter</span> from the reason
        </span>
      </div>
    </form>
  );
}
