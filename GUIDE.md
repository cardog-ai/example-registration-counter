# Build guide: the steps

The commit history follows these steps in order. Each step names the files it
adds and the Cardog SDK calls it introduces.

## 1. Scaffold

A Next.js App Router app with Tailwind, standalone (its own lockfile). The
theme is a counter tool's: 18px base type, black on white, one action colour
and three status colours, Atkinson Hyperlegible for text and VINs.

- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `src/app/globals.css` (theme tokens), `src/app/layout.tsx`
- `.gitignore`, `.prettierrc`, `.env.example`, `LICENSE`

SDK calls: none.

## 2. Staff sign-in

better-auth with email and password, sessions in SQLite through Drizzle, a
`role` field sign-up cannot set (sign-up makes clerks; the seed makes the
supervisor), 12-hour sessions, and protected routes.

- `src/db/schema.ts` (auth tables and `check`), `src/db/index.ts`, `drizzle.config.ts`, `drizzle/`
- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`
- `src/app/api/auth/[...all]/route.ts`, `src/middleware.ts`
- `src/app/(auth)/*` (sign in, sign up), `src/app/page.tsx` (staff front door)
- `src/brand/dvs.tsx`
- `scripts/setup.ts` (migrate and seed the review logins)

SDK calls: none.

## 3. The Cardog client

One server-only client, every call in one file, each one timed and logged
to the developer pane; fixture mode when there is no key.

- `src/lib/cardog.ts`, `src/lib/calls.ts`, `src/lib/fixtures.ts`
- `src/fixtures/*.json`, `scripts/record-fixtures.mjs`
- `src/kit/call-log.tsx`, `src/kit/calls-pane.tsx`, `src/kit/app-shell.tsx`
- `src/app/(app)/layout.tsx`, `src/app/(app)/tabs.tsx`, `src/app/(app)/account-menu.tsx`

SDK calls: `new CardogClient({ apiKey })`.

## 4. The VIN strip

One large field for typing or a barcode scanner, a ruler numbering the 17
positions, the check digit worked out live, and a photo read for a label the
scanner cannot read.

- `src/lib/vin.ts` (scanner clean-up, check digit)
- `src/components/vin-strip.tsx`
- `src/app/api/vin/photo/route.ts`

SDK calls: `cardog.vin.image(base64)`.

## 5. Decode to the form

The decode's refs map onto the Department's code lists for body type, fuel,
weight class and vehicle type. A null ref, or one with no code, is a gap for
the clerk with the reason in words. The model year's recall count is one
informational line.

- `src/lib/registration.ts` (`fieldsFromDecode`, the code lists)
- `src/lib/counter-read.ts`, `src/app/api/vin/decode/route.ts`
- `src/components/reg-form.tsx`, `src/components/recall-line.tsx`

SDK calls: `cardog.v2.vin.getByVin(vin)`, `cardog.v2.recalls.entity(modelYearRef, { limit: 5 })`.

## 6. Document check and record

The make and year on the ownership document are compared with the VIN as
they are typed. The outcome (clear, flagged, or held for a supervisor) is
shown before the clerk records, and worked out again on the server.

- `src/lib/registration.ts` (`compareDocument`, `flagsFor`, `statusFor`)
- `src/lib/checks.ts`, `src/app/actions.ts` (`recordCheck`)
- `src/components/status.tsx`
- `src/app/(app)/counter/page.tsx`, `src/app/(app)/counter/counter.tsx`

SDK calls: none new. Recording reuses the reads the clerk saw; if they have
expired, step 5's calls run again.

## 7. The day log

Every check on a day, newest first, with counts by status; each check opens
with its fields and where each value came from, the document, the recall
line, earlier checks of the same VIN, and the calls behind it.

- `src/app/(app)/log/page.tsx`
- `src/app/(app)/checks/[id]/page.tsx`

SDK calls: none new. The pane replays the calls stored with the check.

## 8. The supervisor queue

Held checks first, then flagged, oldest first. A supervisor overrides or
accepts, or returns the check to the clerk, and always gives a reason. The
seed fills a morning at the counter.

- `src/app/(app)/queue/page.tsx`
- `src/app/(app)/checks/[id]/decision.tsx`, `src/app/actions.ts` (`decideCheck`)
- `scripts/setup.ts` (seeded checks)

SDK calls: none new.

## 9. Deploy

One container with SQLite on a volume.

- `Dockerfile`, `.dockerignore`, `README.md`, `GUIDE.md`

SDK calls: none new. Set `CARDOG_API_KEY` in the host's environment.
