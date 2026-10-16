"use server";

import { revalidatePath } from "next/cache";
import { createCheck } from "@/lib/checks";
import { dropRead, heldRead, readVin } from "@/lib/counter-read";
import {
  compareDocument,
  flagsFor,
  missing,
  statusFor,
  withEntries,
  type FieldKey,
  type Stated,
} from "@/lib/registration";
import { getViewer } from "@/lib/session";
import { normalizeVin } from "@/lib/vin";

export interface RecordInput {
  vin: string;
  entries: Partial<Record<FieldKey, string>>;
  stated: Stated;
  note: string;
}
export type RecordResult =
  | { ok: true; id: string; number: string; status: "clear" | "flagged" | "held" }
  | { ok: false; error: string };

/**
 * Record a counter check. The rules run here again, on the decode the
 * server holds for this clerk, so the result does not depend on the
 * browser: a field typed by hand is flagged, a document that disagrees
 * with the VIN is held for a supervisor.
 */
export async function recordCheck(input: RecordInput): Promise<RecordResult> {
  const me = await getViewer();
  if (!me) return { ok: false, error: "Your session has ended. Sign in again." };
  const vin = normalizeVin(input.vin);

  let read = heldRead(me.id, vin);
  if (!read) {
    const r = await readVin(me.id, vin, "Counter · record");
    if (!r.ok) return { ok: false, error: r.error };
    read = r.read;
  }

  const fields = withEntries(read.fields, input.entries);
  const stated: Stated = { make: input.stated.make.trim(), year: input.stated.year.trim() };
  const gaps = missing(fields, stated);
  if (gaps.length) return { ok: false, error: `Still to enter: ${gaps.join(", ")}.` };

  const mismatches = compareDocument(fields, stated);
  const flags = flagsFor(fields, read.checkDigit);
  const status = statusFor(mismatches, flags);
  const note = input.note.trim().slice(0, 600) || null;

  const row = createCheck({
    vin,
    clerkId: me.id,
    clerkName: me.name,
    status,
    checkDigit: read.checkDigit,
    year: fields.year.value ? Number(fields.year.value) : null,
    make: fields.make.value,
    model: fields.model.value,
    fields,
    stated,
    mismatches,
    flags,
    recalls: read.recalls,
    clerkNote: note,
    calls: read.calls,
  });
  dropRead(me.id, vin);
  revalidatePath("/log");
  revalidatePath("/queue");
  return { ok: true, id: row.id, number: row.number, status };
}
