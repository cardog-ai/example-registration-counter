import "server-only";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CheckRow } from "@/db/schema";
import type { CallRecord } from "./calls";
import type { RecallLine } from "./counter-read";
import type { Flag, Mismatch, RegFields, Stated } from "./registration";

/** Queries over the `check` table. */

export interface Check extends Omit<CheckRow, "fields" | "stated" | "mismatches" | "flags" | "recalls" | "calls"> {
  fields: RegFields;
  stated: Stated;
  mismatches: Mismatch[];
  flags: Flag[];
  recalls: RecallLine | null;
  calls: CallRecord[];
}

const shape = (r: CheckRow): Check => r as unknown as Check;

/** Today's date at the counter, YYYY-MM-DD, in the server's time zone. */
export function today(at = new Date()) {
  return at.toLocaleDateString("en-CA");
}

/** The next running number for a day: DVS-261016-004. */
function nextNumber(day: string) {
  const prefix = `DVS-${day.slice(2).replace(/-/g, "")}-`;
  const n = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.check)
    .where(like(schema.check.number, `${prefix}%`))
    .get()!.n;
  return `${prefix}${String(n + 1).padStart(3, "0")}`;
}

export function createCheck(v: Omit<Check, "id" | "number" | "day" | "createdAt" | "updatedAt" | "decidedAt" | "decidedBy" | "decisionReason">) {
  const day = today();
  const row = {
    ...v,
    id: crypto.randomUUID(),
    number: nextNumber(day),
    day,
  };
  db.insert(schema.check).values(row).run();
  return row;
}

export function getCheck(id: string): Check | null {
  const r = db.select().from(schema.check).where(eq(schema.check.id, id)).get();
  return r ? shape(r) : null;
}

/** Every check made on a day, newest first. */
export function checksOn(day: string): Check[] {
  return db.select().from(schema.check).where(eq(schema.check.day, day)).orderBy(desc(schema.check.createdAt)).all().map(shape);
}

/** Days that have checks, newest first, for the log's day picker. */
export function daysWithChecks(limit = 30): { day: string; n: number }[] {
  return db
    .select({ day: schema.check.day, n: sql<number>`count(*)` })
    .from(schema.check)
    .groupBy(schema.check.day)
    .orderBy(desc(schema.check.day))
    .limit(limit)
    .all();
}

/** The supervisor's queue: held first, then flagged, oldest first within each. */
export function queue(): Check[] {
  const rows = db
    .select()
    .from(schema.check)
    .where(inArray(schema.check.status, ["held", "flagged"]))
    .orderBy(asc(schema.check.createdAt))
    .all()
    .map(shape);
  return [...rows.filter((r) => r.status === "held"), ...rows.filter((r) => r.status === "flagged")];
}

export function queueCount(): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(schema.check)
    .where(inArray(schema.check.status, ["held", "flagged"]))
    .get()!.n;
}

/** Earlier checks of the same VIN, newest first: a VIN seen twice is worth knowing. */
export function earlierChecks(vin: string, notId: string): Check[] {
  return db
    .select()
    .from(schema.check)
    .where(and(eq(schema.check.vin, vin), sql`${schema.check.id} <> ${notId}`))
    .orderBy(desc(schema.check.createdAt))
    .limit(5)
    .all()
    .map(shape);
}

/** A supervisor's decision on a held or flagged check. */
export function decide(id: string, by: string, outcome: "approved" | "returned", reason: string) {
  const r = db
    .update(schema.check)
    .set({ status: outcome, decidedAt: new Date(), decidedBy: by, decisionReason: reason, updatedAt: new Date() })
    .where(and(eq(schema.check.id, id), inArray(schema.check.status, ["held", "flagged"])))
    .run();
  return r.changes > 0;
}
