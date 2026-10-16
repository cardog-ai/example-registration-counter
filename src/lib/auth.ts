import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

/**
 * better-auth: email and password, database sessions in SQLite.
 * `role` is a user field the sign-up form cannot set (input: false). Anyone
 * who signs up is a counter clerk; the seed script makes the supervisor.
 */
export const auth = betterAuth({
  appName: "Department of Vehicle Services",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3029",
  // Without BETTER_AUTH_SECRET a fixed development secret is used, so the
  // app runs on a fresh clone. Set your own anywhere that is not your laptop.
  secret: process.env.BETTER_AUTH_SECRET ?? "dvs-counter-development-secret-change-me-0000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  // A counter shift, not a month: sessions last 12 hours.
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "clerk", input: false },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
