/**
 * The database: better-auth's four tables, then the counter's one.
 *
 * SQLite through Drizzle, so the app clones and runs with no server to set
 * up. `pnpm db:generate` writes a migration after a change here;
 * `pnpm db:setup` applies migrations and seeds the review logins.
 */
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
};

// ── better-auth ───────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  /** "clerk" or "supervisor". Set by the seed or by hand, never by sign-up. */
  role: text("role").notNull().default("clerk"),
  ...timestamps,
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
});

// ── The counter ───────────────────────────────────────────────────────────

/**
 * One VIN check at the counter: what the VIN decoded to, the registration
 * fields as recorded (each with where its value came from), what the
 * ownership document said, and what the supervisor decided.
 *
 * status
 *   clear     every field came from the VIN and the document agrees
 *   flagged   a field was entered or changed by hand, or the check digit
 *             failed: the supervisor reviews it
 *   held      the document's make or year differs from the VIN: it needs a
 *             supervisor override with a reason
 *   approved  a supervisor accepted it (an override, for a held check)
 *   returned  a supervisor sent it back to the clerk, with a reason
 */
export const check = sqliteTable(
  "check",
  {
    id: text("id").primaryKey(),
    /** DVS-YYMMDD-NNN: the day's running number. */
    number: text("number").notNull().unique(),
    /** Local date the check was made, YYYY-MM-DD: the day log's key. */
    day: text("day").notNull(),
    vin: text("vin").notNull(),
    clerkId: text("clerk_id")
      .notNull()
      .references(() => user.id),
    clerkName: text("clerk_name").notNull(),
    status: text("status", { enum: ["clear", "flagged", "held", "approved", "returned"] }).notNull(),
    /** "ok" or "mismatch": the VIN's own 9th-character check. */
    checkDigit: text("check_digit", { enum: ["ok", "mismatch"] }).notNull(),
    year: integer("year"),
    make: text("make"),
    model: text("model"),
    /** The registration fields, each { value, label, source, decoded } (lib/registration.ts). */
    fields: text("fields", { mode: "json" }).notNull(),
    /** What the ownership document says: { make, year }. */
    stated: text("stated", { mode: "json" }).notNull(),
    /** Document vs VIN differences: [{ field, document, vin }]. */
    mismatches: text("mismatches", { mode: "json" }).notNull(),
    /** Why the supervisor sees it: [{ field, reason }]. */
    flags: text("flags", { mode: "json" }).notNull(),
    /** The informational recall line: { modelYearRef, total, campaigns } or null. */
    recalls: text("recalls", { mode: "json" }),
    clerkNote: text("clerk_note"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    decidedBy: text("decided_by"),
    decisionReason: text("decision_reason"),
    /** The SDK calls behind the check, so the developer pane can replay them. */
    calls: text("calls", { mode: "json" }).notNull(),
    ...timestamps,
  },
  (t) => [index("check_day_idx").on(t.day), index("check_status_idx").on(t.status), index("check_vin_idx").on(t.vin)]
);

export type CheckRow = typeof check.$inferSelect;
