/**
 * pnpm db:setup — create the SQLite database, apply migrations, and seed
 * the review accounts and a morning at the counter. Safe to run again: it
 * only seeds an empty database. `pnpm dev` runs it first, so a fresh clone
 * needs nothing else.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { hashPassword } from "better-auth/crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "../src/db/schema";
import { trimForDisplay, type CallRecord } from "../src/lib/calls";
import {
  compareDocument,
  fieldsFromDecode,
  flagsFor,
  statusFor,
  withEntries,
  type DecodeLike,
  type FieldKey,
} from "../src/lib/registration";
import corolla from "../src/fixtures/5YFB4MBE3NP125200.json";
import ram from "../src/fixtures/3C63R3NL9NG189460.json";
import cascadia from "../src/fixtures/1FUJHTDVXLLMD3594.json";
import glide from "../src/fixtures/1HD1FF41X9Y666062.json";

const path = process.env.DATABASE_PATH ?? "data/counter.db";
mkdirSync(dirname(path), { recursive: true });
const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: "drizzle" });

const ACCOUNTS = [
  { name: "Jordan Ellis", email: "clerk@dvs.example", password: "counter-clerk", role: "clerk" },
  { name: "Priya Natarajan", email: "supervisor@dvs.example", password: "counter-supervisor", role: "supervisor" },
  { name: "Morgan Okafor", email: "morgan@dvs.example", password: "counter-clerk", role: "clerk" },
] as const;

type Fixture = {
  vin: string;
  calls: Record<string, { ok: boolean; ms: number; provenance?: string; response?: unknown }>;
};

/** The call records a check made, rebuilt from the fixture it was seeded from. */
function seededCalls(f: Fixture, at: Date): CallRecord[] {
  const d = f.calls.decode.response as DecodeLike;
  const my = d.refs.modelYear!;
  const rec = (method: string, args: unknown[], http: string, returns: string, c: Fixture["calls"][string]): CallRecord => ({
    id: crypto.randomUUID(),
    step: "Counter · decode",
    method,
    args,
    http,
    returns,
    ok: true,
    status: 200,
    ms: c.ms,
    mode: "fixture",
    provenance: `seeded by pnpm db:setup; ${c.provenance}`,
    response: trimForDisplay(c.response),
    at: at.toISOString(),
  });
  return [
    rec("cardog.v2.vin.getByVin", [f.vin], `GET /v2/vin/${f.vin}`, "Identity card", f.calls.decode),
    rec("cardog.v2.recalls.entity", [my, { limit: 5 }], `GET /v2/recalls/entity/${my}?limit=5`, "Recall campaigns for the model year", f.calls.recalls),
  ];
}

async function seed() {
  const ids: Record<string, { id: string; name: string }> = {};
  for (const a of ACCOUNTS) {
    const id = crypto.randomUUID();
    ids[a.email] = { id, name: a.name };
    db.insert(schema.user).values({ id, name: a.name, email: a.email, emailVerified: true, role: a.role }).run();
    db.insert(schema.account)
      .values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(a.password) })
      .run();
  }

  const now = Date.now();
  const yesterday = new Date(now - 24 * 3600 * 1000);
  const seq: Record<string, number> = {};

  // A morning at the counter: one clear, two flagged (one already accepted),
  // one held for an override; and the Ram's first visit, yesterday.
  const visits: {
    fx: unknown;
    clerk: string;
    at: Date;
    stated: { make: string; year: string };
    entries?: Partial<Record<FieldKey, string>>;
    note?: string;
    decision?: { outcome: "approved" | "returned"; reason: string };
  }[] = [
    { fx: ram, clerk: "clerk@dvs.example", at: new Date(yesterday.getTime() - 2 * 3600 * 1000), stated: { make: "Ram", year: "2022" } },
    { fx: cascadia, clerk: "morgan@dvs.example", at: new Date(now - 3 * 3600 * 1000), stated: { make: "Freightliner", year: "2020" } },
    {
      fx: corolla,
      clerk: "morgan@dvs.example",
      at: new Date(now - 2 * 3600 * 1000),
      stated: { make: "Toyota", year: "2022" },
      entries: { weightClass: "1" },
      note: "Weight class taken from the compliance label on the door jamb: 1,770 kg.",
    },
    {
      fx: glide,
      clerk: "morgan@dvs.example",
      at: new Date(now - 100 * 60 * 1000),
      stated: { make: "Harley Davidson", year: "2009" },
      entries: { weightClass: "NA" },
      decision: { outcome: "approved", reason: "Motorcycles are not rated on this form. Not rated is correct." },
    },
    {
      fx: ram,
      clerk: "clerk@dvs.example",
      at: new Date(now - 40 * 60 * 1000),
      stated: { make: "Dodge", year: "2022" },
      note: "The previous registration lists the make as Dodge. Customer says it was bought as a Dodge Ram.",
    },
  ];

  for (const v of visits) {
    const f = v.fx as Fixture;
    const decode = f.calls.decode.response as DecodeLike;
    const r = f.calls.recalls.response as { total: number; recalls: { authorityLabel: string; campaignNumber: string; component: string | null; recallDate: string | null }[] };
    const fields = withEntries(fieldsFromDecode(decode), v.entries ?? {});
    const mismatches = compareDocument(fields, v.stated);
    const flags = flagsFor(fields, "ok");
    const status = statusFor(mismatches, flags);
    const day = v.at.toLocaleDateString("en-CA");
    seq[day] = (seq[day] ?? 0) + 1;
    const clerk = ids[v.clerk];
    db.insert(schema.check)
      .values({
        id: crypto.randomUUID(),
        number: `DVS-${day.slice(2).replace(/-/g, "")}-${String(seq[day]).padStart(3, "0")}`,
        day,
        vin: f.vin,
        clerkId: clerk.id,
        clerkName: clerk.name,
        status: v.decision?.outcome ?? status,
        checkDigit: "ok",
        year: decode.year,
        make: fields.make.value,
        model: fields.model.value,
        fields,
        stated: v.stated,
        mismatches,
        flags,
        recalls: {
          modelYearRef: decode.refs.modelYear!,
          total: r.total,
          campaigns: r.recalls.map(({ authorityLabel, campaignNumber, component, recallDate }) => ({ authorityLabel, campaignNumber, component, recallDate })),
        },
        clerkNote: v.note ?? null,
        decidedAt: v.decision ? new Date(v.at.getTime() + 20 * 60 * 1000) : null,
        decidedBy: v.decision ? "Priya Natarajan" : null,
        decisionReason: v.decision?.reason ?? null,
        calls: seededCalls(f, v.at),
        createdAt: v.at,
        updatedAt: v.at,
      })
      .run();
  }

  console.log(`Database created at ${path}. Review logins:`);
  for (const a of ACCOUNTS.slice(0, 2)) console.log(`  ${a.role.padEnd(11)} ${a.email} / ${a.password}`);
}

if (db.select().from(schema.user).all().length > 0) {
  console.log(`Database ready at ${path}.`);
} else {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
