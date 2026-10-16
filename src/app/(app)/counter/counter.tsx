"use client";

/**
 * The counter screen, top to bottom in the order a clerk works:
 *   1. VIN strip: type or scan; the check digit is worked out live.
 *   2. Vehicle details: filled from the decode; gaps marked for the clerk.
 *   3. Ownership document: the make and year it states, compared to the VIN.
 *   4. Outcome: clear, flagged, or held for a supervisor, then record.
 *
 * Keyboard: / goes to the VIN from anywhere, Enter decodes, Ctrl+Enter
 * (⌘+Enter) records, Esc starts the next customer.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { recordCheck, type RecordResult } from "@/app/actions";
import { RecallLine } from "@/components/recall-line";
import { RegForm } from "@/components/reg-form";
import { StatusBadge } from "@/components/status";
import { VinStrip } from "@/components/vin-strip";
import { useCallLog } from "@/kit/call-log";
import type { CallRecord } from "@/lib/calls";
import type { CounterRead } from "@/lib/counter-read";
import {
  compareDocument,
  flagsFor,
  missing,
  statusFor,
  withEntries,
  type FieldKey,
  type Stated,
} from "@/lib/registration";
import { checkVin, normalizeVin } from "@/lib/vin";

type Sample = { vin: string; label: string; shows: string };

export function Counter({ samples }: { samples: Sample[] | null }) {
  const { add, clear } = useCallLog();
  const vinRef = useRef<HTMLInputElement>(null);
  const makeRef = useRef<HTMLInputElement>(null);

  const [raw, setRaw] = useState("");
  const vin = normalizeVin(raw);
  const check = checkVin(vin);

  const [read, setRead] = useState<CounterRead | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [entries, setEntries] = useState<Partial<Record<FieldKey, string>>>({});
  const [stated, setStated] = useState<Stated>({ make: "", year: "" });
  const [note, setNote] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [last, setLast] = useState<(RecordResult & { ok: true }) | null>(null);
  const [saving, startSaving] = useTransition();

  // The rules, live, exactly as the server will apply them.
  const fields = useMemo(() => (read ? withEntries(read.fields, entries) : null), [read, entries]);
  const mismatches = useMemo(() => (fields ? compareDocument(fields, stated) : []), [fields, stated]);
  const flags = useMemo(() => (fields && read ? flagsFor(fields, read.checkDigit) : []), [fields, read]);
  const outcome = statusFor(mismatches, flags);
  const gaps = fields ? missing(fields, stated) : [];
  const conflicts = useMemo(() => new Set<FieldKey>(mismatches.map((m) => m.field)), [mismatches]);

  const reset = useCallback(() => {
    setRaw("");
    setRead(null);
    setDecodeError(null);
    setEntries({});
    setStated({ make: "", year: "" });
    setNote("");
    setSaveError(null);
    clear();
    requestAnimationFrame(() => vinRef.current?.focus());
  }, [clear]);

  const decode = useCallback(
    async (force = false) => {
      if (busy) return;
      if (check.state !== "ok" && !(force && check.state === "check-mismatch")) {
        vinRef.current?.focus();
        return;
      }
      setBusy(true);
      setDecodeError(null);
      setSaveError(null);
      setRead(null);
      setEntries({});
      try {
        const res = await fetch("/api/vin/decode", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vin, force }),
        });
        const body = (await res.json()) as
          | { ok: true; read: CounterRead }
          | { ok: false; error: string; calls?: CallRecord[] };
        if (body.ok) {
          add(body.read.calls);
          setRead(body.read);
          // Next stop: the first field the VIN left empty, else the document.
          const firstGap = Object.values(body.read.fields).find((f) => f.source === "manual");
          requestAnimationFrame(() => {
            const el = firstGap ? document.getElementById(`field-${firstGap.key}`) : makeRef.current;
            (el as HTMLElement | null)?.focus();
          });
        } else {
          if (body.calls) add(body.calls);
          setDecodeError(body.error);
        }
      } catch {
        setDecodeError("The decode did not answer. Try again, or register the vehicle by hand.");
      } finally {
        setBusy(false);
      }
    },
    [add, busy, check.state, vin]
  );

  const save = useCallback(() => {
    if (!read || saving) return;
    if (gaps.length) {
      setSaveError(`Still to enter: ${gaps.join(", ")}.`);
      return;
    }
    startSaving(async () => {
      const r = await recordCheck({ vin: read.vin, entries, stated, note });
      if (r.ok) {
        setLast(r);
        reset();
      } else {
        setSaveError(r.error);
      }
    });
  }, [entries, gaps, note, read, reset, saving, stated]);

  async function photo(file: File) {
    setPhotoBusy(true);
    setDecodeError(null);
    try {
      const form = new FormData();
      form.set("photo", file);
      const res = await fetch("/api/vin/photo", { method: "POST", body: form });
      const body = (await res.json()) as { ok: boolean; vin: string | null; error: string | null; calls: CallRecord[] };
      add(body.calls ?? []);
      if (body.ok && body.vin) {
        setRaw(body.vin);
        setRead(null);
        vinRef.current?.focus();
      } else setDecodeError(body.error);
    } finally {
      setPhotoBusy(false);
    }
  }

  // Counter keys.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        vinRef.current?.focus();
        vinRef.current?.select();
      } else if (e.key === "Escape" && t.tagName !== "SELECT") {
        e.preventDefault();
        reset();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, save]);

  // Focus the VIN when the screen opens.
  useEffect(() => vinRef.current?.focus(), []);

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <LastCheck last={last} />

      <section className="rounded-[8px] border-2 border-ink bg-card p-4 sm:p-5">
        <VinStrip
          ref={vinRef}
          value={raw}
          check={check}
          busy={busy}
          onChange={(v) => {
            setRaw(v);
            if (read && normalizeVin(v) !== read.vin) setRead(null);
          }}
          onSubmit={() => decode(false)}
          onForce={() => decode(true)}
          onPhoto={photo}
          photoBusy={photoBusy}
        />
        {samples && <Samples samples={samples} onPick={(v) => { setRaw(v); setRead(null); vinRef.current?.focus(); }} />}
      </section>

      <p role="alert" className={`min-h-0 font-bold text-stop ${decodeError ? "rounded-[8px] border-2 border-stop bg-stop-wash px-4 py-3" : ""}`}>
        {decodeError}
      </p>

      <RegForm
        fields={fields}
        entries={entries}
        onEntry={(k, v) => setEntries((e) => ({ ...e, [k]: v }))}
        conflicts={conflicts}
      />

      <RecallLine recalls={read ? read.recalls : undefined} vehicle={read?.vehicle ?? null} />

      <section className="rounded-[8px] border-2 border-ink bg-card">
        <div className="border-b-2 border-ink px-4 py-3 sm:px-5">
          <p className="text-[1.05rem] font-bold">Ownership document</p>
          <p className="text-[0.88rem] text-muted">As printed on the document the customer brought: the previous registration or the bill of sale.</p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_13rem] sm:p-5">
          <label className="block">
            <span className="mb-2 block font-bold">Make on the document</span>
            <input
              ref={makeRef}
              className="field"
              value={stated.make}
              disabled={!read}
              autoComplete="off"
              onChange={(e) => setStated((s) => ({ ...s, make: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-2 block font-bold">Year on the document</span>
            <input
              className="field"
              value={stated.year}
              disabled={!read}
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              onChange={(e) => setStated((s) => ({ ...s, year: e.target.value.replace(/\D/g, "") }))}
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Compare label="Make" doc={stated.make} vin={fields?.make.decoded ?? null} differs={conflicts.has("make")} />
            <Compare label="Year" doc={stated.year} vin={fields?.year.decoded ?? null} differs={conflicts.has("year")} />
          </div>
        </div>
      </section>

      <section className={`rounded-[8px] border-2 ${read ? outcomeBorder(outcome) : "border-rule"} bg-card p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[1.05rem] font-bold">Outcome</p>
          {read ? <StatusBadge status={outcome} /> : <span className="text-muted">After a decode</span>}
        </div>
        <div className="mt-3 min-h-[3rem] text-[0.95rem]">
          {!read ? (
            <p className="text-muted">The outcome is worked out from the fields and the document as you go.</p>
          ) : outcome === "clear" ? (
            <p>Every field came from the VIN and the document agrees. The check is recorded as clear.</p>
          ) : (
            <>
              <p className="font-bold">
                {outcome === "held"
                  ? "The document disagrees with the VIN. A supervisor must override it, with a reason, before the registration goes ahead."
                  : "The check is recorded and goes to the supervisor's queue for review:"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {mismatches.map((m) => (
                  <li key={m.field}>
                    {m.field === "make" ? "Make" : "Year"}: the document says {m.document}, the VIN says {m.vin}.
                  </li>
                ))}
                {flags.map((f) => (
                  <li key={f.field + f.reason}>{f.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block font-bold">
            Note for the supervisor <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            className="field h-24 py-3"
            value={note}
            disabled={!read}
            maxLength={600}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p role="alert" className="mt-3 min-h-[1.5rem] font-bold text-stop">
          {saveError}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`btn ${read && outcome === "held" ? "btn-stop" : "btn-act"} min-w-[14rem]`}
            disabled={!read || saving}
            onClick={save}
            aria-keyshortcuts="Control+Enter Meta+Enter"
          >
            {saving ? "Recording…" : read && outcome === "held" ? "Send to supervisor" : "Record check"}
          </button>
          <button type="button" className="btn btn-line" onClick={reset} aria-keyshortcuts="Escape">
            Next customer
          </button>
        </div>
      </section>

      <KeyLegend />
    </div>
  );
}

function Compare({ label, doc, vin, differs }: { label: string; doc: string; vin: string | null; differs: boolean }) {
  const text = !vin
    ? `${label}: the VIN does not say, so there is nothing to compare.`
    : !doc.trim()
      ? `${label}: the VIN says ${vin}.`
      : differs
        ? `${label} differs: the document says ${doc.trim()}, the VIN says ${vin}.`
        : `${label} agrees with the VIN.`;
  const tone = differs ? "border-stop bg-stop-wash font-bold text-stop" : doc.trim() && vin ? "border-act bg-act-wash text-good" : "border-rule text-muted";
  return <p className={`min-h-[2.75rem] rounded-[6px] border-l-[6px] px-3 py-2 ${tone}`}>{text}</p>;
}

function outcomeBorder(s: "clear" | "flagged" | "held") {
  return s === "held" ? "border-stop" : s === "flagged" ? "border-flag-edge" : "border-act";
}

/** The last check this clerk recorded. The slot keeps its height when empty. */
function LastCheck({ last }: { last: (RecordResult & { ok: true }) | null }) {
  return (
    <div className="flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 rounded-[8px] border-2 border-dashed border-rule-strong px-4 py-2">
      {last ? (
        <>
          <p role="status" className="flex flex-wrap items-center gap-3">
            <span className="font-bold">Recorded {last.number}</span>
            <StatusBadge status={last.status} />
          </p>
          <Link href={`/checks/${last.id}`} className="link font-bold">
            Open the check
          </Link>
        </>
      ) : (
        <p className="text-muted">No check recorded yet this session.</p>
      )}
    </div>
  );
}

function Samples({ samples, onPick }: { samples: Sample[]; onPick: (vin: string) => void }) {
  return (
    <details className="mt-4 border-t border-rule pt-3">
      <summary className="cursor-pointer font-bold text-muted">Sample VINs (fixture mode)</summary>
      <ul className="mt-3 divide-y divide-rule">
        {samples.map((s) => (
          <li key={s.vin} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <button type="button" className="link font-mono font-bold tracking-[0.08em]" onClick={() => onPick(s.vin)}>
              {s.vin}
            </button>
            <span className="text-[0.88rem] text-muted">
              {s.label} · {s.shows}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function KeyLegend() {
  const keys: [string, string][] = [
    ["/", "VIN field"],
    ["Enter", "Decode"],
    ["Ctrl + Enter", "Record"],
    ["Esc", "Next customer"],
    ["Alt + L", "Day log"],
  ];
  return (
    <ul aria-label="Keyboard" className="hidden flex-wrap gap-x-6 gap-y-2 text-[0.85rem] text-muted sm:flex">
      {keys.map(([k, v]) => (
        <li key={k} className="flex items-center gap-2">
          <span className="kbd">{k}</span>
          {v}
        </li>
      ))}
    </ul>
  );
}
