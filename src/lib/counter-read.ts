import "server-only";
import { decodeVin, readModelYearRecalls, type ModelYearRecalls, type VinIdentity } from "./cardog";
import type { CallRecord } from "./calls";
import { fieldsFromDecode, type RegFields } from "./registration";
import { checkVin } from "./vin";

/**
 * The reads behind one VIN at the counter: the decode, then the model
 * year's recall count. They are held per clerk for an hour, so recording
 * the check reuses what the clerk saw (and the server applies the rules to
 * the decode it holds, not to whatever the browser sends back).
 */

export interface RecallLine {
  modelYearRef: string;
  total: number;
  campaigns: { authorityLabel: string; campaignNumber: string; component: string | null; recallDate: string | null }[];
}

export interface CounterRead {
  vin: string;
  checkDigit: "ok" | "mismatch";
  /** "2022 Ram 3500", or null when the VIN did not decode. */
  vehicle: string | null;
  fields: RegFields;
  recalls: RecallLine | null;
  calls: CallRecord[];
}

interface Held {
  read: CounterRead;
  at: number;
}

const TTL = 60 * 60 * 1000;
const g = globalThis as unknown as { __counterReads?: Map<string, Held> };
const held = g.__counterReads ?? (g.__counterReads = new Map());
const keyOf = (clerkId: string, vin: string) => `${clerkId}:${vin}`;

export async function readVin(
  clerkId: string,
  vin: string,
  step = "Counter · decode"
): Promise<{ ok: true; read: CounterRead } | { ok: false; error: string; calls: CallRecord[] }> {
  const decoded = await decodeVin(vin, step);
  if (!decoded.data) return { ok: false, error: decoded.error ?? "The decode failed.", calls: [decoded.call] };
  const d: VinIdentity = decoded.data;
  if (!d.valid) {
    const why = d.reasons?.length ? ` (${d.reasons.join(", ")})` : "";
    return {
      ok: false,
      error: `This VIN does not decode to a vehicle${why}. Read it from the vehicle again, or register it by hand.`,
      calls: [decoded.call],
    };
  }

  const calls = [decoded.call];
  let recalls: RecallLine | null = null;
  if (d.refs.modelYear) {
    const r = await readModelYearRecalls(d.refs.modelYear, vin, step);
    calls.push(r.call);
    if (r.data) recalls = recallLine(d.refs.modelYear, r.data);
  }

  const check = checkVin(vin);
  const read: CounterRead = {
    vin,
    checkDigit: check.state === "check-mismatch" ? "mismatch" : "ok",
    vehicle: [d.year, d.make, d.model].filter(Boolean).join(" ") || null,
    fields: fieldsFromDecode(d),
    recalls,
    calls,
  };
  held.set(keyOf(clerkId, vin), { read, at: Date.now() });
  return { ok: true, read };
}

/** What the clerk read for this VIN, if it is still held. */
export function heldRead(clerkId: string, vin: string): CounterRead | null {
  const h = held.get(keyOf(clerkId, vin));
  if (!h || Date.now() - h.at > TTL) return null;
  return h.read;
}

export function dropRead(clerkId: string, vin: string) {
  held.delete(keyOf(clerkId, vin));
}

function recallLine(modelYearRef: string, r: ModelYearRecalls): RecallLine {
  return {
    modelYearRef,
    total: r.total,
    campaigns: r.recalls.map((c) => ({
      authorityLabel: c.authorityLabel,
      campaignNumber: c.campaignNumber,
      component: c.component,
      recallDate: c.recallDate,
    })),
  };
}
