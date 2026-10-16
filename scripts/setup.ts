/**
 * pnpm db:setup — create the SQLite database, apply migrations, and seed
 * the review accounts. Safe to run again: it only seeds an empty database.
 * `pnpm dev` runs it first, so a fresh clone needs nothing else.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { hashPassword } from "better-auth/crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "../src/db/schema";

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

async function seed() {
  for (const a of ACCOUNTS) {
    const id = crypto.randomUUID();
    db.insert(schema.user).values({ id, name: a.name, email: a.email, emailVerified: true, role: a.role }).run();
    db.insert(schema.account)
      .values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(a.password) })
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
