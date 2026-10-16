"use client";

/**
 * The registration form's vehicle section. Every row has three parts: the
 * label, the value, and where the value came from, in words. The left edge
 * repeats the source as a bar so a clerk can scan the column:
 *   solid green   from the VIN
 *   amber         entered or changed by hand (goes to the supervisor)
 *   red           the document disagrees with the VIN
 * Before a decode the rows are drawn empty at full height, so the form
 * never grows when it fills.
 */

import { FIELDS, labelFor, type FieldKey, type RegFields } from "@/lib/registration";

export function RegForm({
  fields,
  entries,
  onEntry,
  conflicts,
}: {
  fields: RegFields | null;
  entries: Partial<Record<FieldKey, string>>;
  onEntry: (key: FieldKey, value: string) => void;
  /** Fields the ownership document disagrees on. */
  conflicts: Set<FieldKey>;
}) {
  return (
    <fieldset className="rounded-[8px] border-2 border-ink bg-card">
      <legend className="sr-only">Vehicle details for the registration</legend>
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-3 sm:px-5">
        <p className="text-[1.05rem] font-bold">Vehicle details</p>
        <p className="text-[0.85rem] text-muted">{fields ? "Filled from the VIN where it says" : "Fills from the VIN"}</p>
      </div>
      <ol>
        {FIELDS.map((f, i) => {
          const x = fields?.[f.key] ?? null;
          const value = entries[f.key] ?? x?.value ?? "";
          const source = !x ? "empty" : x.decoded === null ? "manual" : value === x.decoded ? "vin" : "changed";
          const conflict = conflicts.has(f.key);
          const id = `field-${f.key}`;
          const bar = conflict
            ? "bg-stop"
            : source === "vin"
              ? "bg-act"
              : source === "manual" || source === "changed"
                ? "bg-flag-edge"
                : "bg-rule";
          return (
            <li key={f.key} className={`relative grid gap-x-4 gap-y-2 py-3 pl-5 pr-4 sm:grid-cols-[12rem_minmax(0,1fr)_9.5rem] sm:items-center sm:pl-6 sm:pr-5 ${i ? "border-t border-rule" : ""} ${source === "manual" && !value ? "bg-flag-wash" : ""}`}>
              <span aria-hidden className={`absolute inset-y-0 left-0 w-[6px] ${bar}`} />
              <label htmlFor={id} className="font-bold">
                {f.label}
              </label>
              {f.codes ? (
                <select
                  id={id}
                  className="field"
                  disabled={!x}
                  value={value}
                  onChange={(e) => onEntry(f.key, e.target.value)}
                  aria-describedby={x?.gap ? `${id}-gap` : undefined}
                >
                  <option value="">{x ? "Choose…" : ""}</option>
                  {f.codes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  className="field"
                  disabled={!x}
                  value={value}
                  inputMode={f.key === "year" ? "numeric" : "text"}
                  maxLength={f.key === "year" ? 4 : 40}
                  onChange={(e) => onEntry(f.key, e.target.value)}
                  aria-describedby={x?.gap ? `${id}-gap` : undefined}
                />
              )}
              <SourceTag source={source} conflict={conflict} filled={!!value} decoded={x ? labelFor(f.key, x.decoded) : null} />
              {x?.gap && (
                <p id={`${id}-gap`} className="text-[0.92rem] text-flag sm:col-span-2 sm:col-start-2">
                  {x.gap}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function SourceTag({
  source,
  conflict,
  filled,
  decoded,
}: {
  source: "empty" | "vin" | "manual" | "changed";
  conflict: boolean;
  filled: boolean;
  decoded: string | null;
}) {
  if (source === "empty") return <span className="hidden text-[0.85rem] text-faint sm:block">—</span>;
  if (conflict)
    return <span className="text-[0.88rem] font-bold text-stop">Document differs</span>;
  if (source === "vin") return <span className="text-[0.88rem] font-bold text-good">From the VIN</span>;
  if (source === "changed")
    return (
      <span className="text-[0.88rem] font-bold text-flag" title={decoded ? `The VIN says ${decoded}` : undefined}>
        Changed by hand
      </span>
    );
  return <span className="text-[0.88rem] font-bold text-flag">{filled ? "Entered by hand" : "Enter by hand"}</span>;
}
