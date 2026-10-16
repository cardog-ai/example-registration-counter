"use client";

/**
 * The VIN strip: one large field a clerk types into or a barcode scanner
 * types into (a scanner is a keyboard that ends with Enter). Under it, a
 * ruler numbers the 17 positions so a clerk reading a VIN aloud can say
 * "position 9", and marks the character a check points at.
 *
 * The ruler and the status line keep their height in every state, so
 * nothing below the strip moves while the VIN goes in.
 */

import { forwardRef, useRef } from "react";
import type { VinCheck } from "@/lib/vin";

const SPACING = "0.32em";

export const VinStrip = forwardRef<
  HTMLInputElement,
  {
    value: string;
    check: VinCheck;
    busy: boolean;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onPhoto: (file: File) => void;
    photoBusy: boolean;
    /** Decode a VIN that fails its check digit anyway; the check is flagged. */
    onForce: () => void;
  }
>(function VinStrip({ value, check, busy, onChange, onSubmit, onPhoto, photoBusy, onForce }, ref) {
  const fileRef = useRef<HTMLInputElement>(null);
  const bad = check.state === "invalid" ? check.at : check.state === "check-mismatch" ? 8 : -1;
  const tone =
    check.state === "invalid" || check.state === "check-mismatch"
      ? "border-stop"
      : check.state === "ok"
        ? "border-act"
        : "border-ink";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor="vin" className="text-[1.05rem] font-bold">
          Vehicle identification number
        </label>
        <span className="text-[0.85rem] text-muted">
          Type or scan, then <span className="kbd">Enter</span>
        </span>
      </div>

      <div className={`mt-2 rounded-[8px] border-[3px] bg-card ${tone}`}>
        <input
          ref={ref}
          id="vin"
          name="vin"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={40}
          aria-describedby="vin-status"
          aria-invalid={bad >= 0}
          placeholder="17 characters"
          className="block w-full bg-transparent px-3 pb-1 pt-3 font-mono font-bold uppercase text-ink outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-faint sm:px-4"
          style={{ fontSize: "clamp(1.2rem, 5.1vw, 2rem)", letterSpacing: SPACING }}
        />
        <div
          aria-hidden
          className="flex select-none px-3 pb-2 font-mono sm:px-4"
          style={{ fontSize: "clamp(1.2rem, 5.1vw, 2rem)" }}
        >
          {Array.from({ length: 17 }, (_, i) => {
            const filled = i < value.length;
            const isBad = i === bad;
            return (
              <span key={i} className="flex flex-col items-start" style={{ width: `calc(1ch + ${SPACING})` }}>
                <span
                  className={`block h-[4px] rounded-full ${isBad ? "bg-stop" : filled ? "bg-ink" : "bg-rule"}`}
                  style={{ width: "1ch" }}
                />
                <span
                  className={`mt-1 block text-center leading-none tabular-nums ${
                    isBad ? "font-bold text-stop" : i === 8 ? "font-bold text-ink" : "text-faint"
                  }`}
                  style={{ width: "1.6ch", fontSize: "max(0.6rem, 0.32em)" }}
                >
                  {i + 1}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex min-h-[3.25rem] flex-wrap items-start justify-between gap-3">
        <p id="vin-status" role="status" className={`min-w-0 flex-1 pt-1 ${statusTone(check)}`}>
          {statusText(check, busy)}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {check.state === "check-mismatch" && (
            <button type="button" className="btn btn-line h-11" onClick={onForce} disabled={busy}>
              Decode as typed
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(f);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-line h-11" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
            {photoBusy ? "Reading photo" : "Read from photo"}
          </button>
        </div>
      </div>
    </div>
  );
});

function statusText(c: VinCheck, busy: boolean) {
  if (busy) return "Decoding…";
  switch (c.state) {
    case "empty":
      return "Waiting for a VIN. Press / to come back to this field from anywhere.";
    case "typing":
      return `${c.remaining} more character${c.remaining === 1 ? "" : "s"}.`;
    default:
      return c.message;
  }
}

function statusTone(c: VinCheck) {
  if (c.state === "invalid" || c.state === "check-mismatch") return "font-bold text-stop";
  if (c.state === "ok") return "font-bold text-good";
  return "text-muted";
}
