# Registration counter: a VIN check on the Cardog API

The Department of Vehicle Services registers vehicles at a counter. This is
the counter's VIN check: a clerk types or scans the VIN, the app works out
the check digit, decodes the VIN, and fills the vehicle section of the
registration form. Where the decode does not say, the field is left for the
clerk and marked, never guessed. When the ownership document disagrees with
the VIN on make or year, the check is held until a supervisor overrides it
with a reason.

It is a complete Next.js app: staff accounts with
[better-auth](https://better-auth.com), SQLite through Drizzle, the counter,
a day log, and a supervisor queue. It runs on a fresh clone with no keys.

## The Cardog calls

Every call is in [`src/lib/cardog.ts`](src/lib/cardog.ts), server-side,
through [`@cardog/api`](https://www.npmjs.com/package/@cardog/api):

```ts
import { CardogClient } from "@cardog/api";
const cardog = new CardogClient({ apiKey: process.env.CARDOG_API_KEY });
```

| Screen | Call | What the app uses |
| --- | --- | --- |
| Counter, after Enter | `cardog.v2.vin.getByVin(vin)` | `year`, `make`, `model`, and the refs `bodyStyle`, `fuelType`, `electrificationLevel`, `vehicleType`, `gvwr`, mapped onto the form's code lists |
| Counter, after the decode | `cardog.v2.recalls.entity(modelYearRef, { limit: 5 })` | `total`: one informational line, "Recalls issued for this model and year" |
| Counter, Read from photo | `cardog.vin.image(base64)` | The VIN read from a photo of the door-jamb label or a document |

The check digit is not a call: `src/lib/vin.ts` works it out as the VIN goes
in. The decode reads the build (positions 1 to 8 and 10), so a VIN one
character off at position 9 can still decode; the counter's own check is
what catches it.

The right-hand pane (an **API calls** pill on a phone), **What the app
called**, shows each call as it happens: the method, the HTTP request, a
trimmed response and the latency. A recorded check keeps its calls, so
opening it from the log or the queue replays them. The key never reaches the
browser.

## Run it

Node 20.9 or newer and pnpm.

```bash
git clone <this repo> registration-counter && cd registration-counter
pnpm install
pnpm dev
```

Open http://localhost:3029. `pnpm dev` creates `data/counter.db`, applies the
migrations and seeds the accounts the first time. Sign in with:

| Role | Email | Password |
| --- | --- | --- |
| Counter clerk | `clerk@dvs.example` | `counter-clerk` |
| Supervisor | `supervisor@dvs.example` | `counter-supervisor` |

A second clerk, `morgan@dvs.example` (`counter-clerk`), has worked the
morning already: the day log has five checks across two days and the
supervisor queue has one override and one flag waiting. New accounts made at
`/sign-up` are clerks.

### Keys at the counter

| Key | Does |
| --- | --- |
| `/` | Back to the VIN field from anywhere |
| `Enter` | Decode (a barcode scanner sends this itself) |
| `Ctrl` + `Enter` (`⌘` + `Enter`) | Record the check, or send it to the supervisor |
| `Esc` | Next customer: clear the screen |
| `Alt` + `C` / `L` / `Q` | Counter, Day log, Queue |

The VIN field drops what scanners add: spaces, dashes, Code 39 asterisks,
and the leading `I` some import barcodes carry as an 18th character.

### Fixture mode and live mode

With no `CARDOG_API_KEY`, every call is served from `src/fixtures/`, and the
counter lists the sample VINs:

| VIN | Vehicle | Shows |
| --- | --- | --- |
| `3C63R3NL9NG189460` | 2022 Ram 3500 pickup | Every field from the VIN, weight class 3. Type `Dodge` as the document's make to see a hold |
| `1FUJHTDVXLLMD3594` | 2020 Freightliner Cascadia | Truck-tractor, weight class 8 |
| `5YFB4MBE3NP125200` | 2022 Toyota Corolla | No weight class in the decode: entered by hand, flagged |
| `1HD1FF41X9Y666062` | 2009 Harley-Davidson Electra Glide Classic | Motorcycle, no weight class |
| `5YFB4MBE7NP125200` | The Corolla, one character off | Fails its check digit; **Decode as typed** flags it |

Each fixture call says how it was obtained (`provenance`), and the pane shows
it. To call the API instead:

```bash
cp .env.example .env.local
# set CARDOG_API_KEY (https://cardog.app/account/api)
pnpm dev
```

To re-record the fixtures from the live API with your key:

```bash
CARDOG_API_KEY=... pnpm record-fixtures
```

## How it fits together

```
src/
  lib/cardog.ts          every Cardog call, the client, fixture switch
  lib/vin.ts             normalising scanner input, the check digit
  lib/registration.ts    decode → the form's codes; the clear / flagged / held rules (pure)
  lib/counter-read.ts    the reads behind one VIN, held per clerk for an hour
  lib/checks.ts          check queries: create, day log, queue, decide
  lib/auth.ts            better-auth: email + password, SQLite sessions, role
  db/schema.ts           better-auth tables + check
  app/actions.ts         server actions: record a check, decide one
  app/api/vin/*          route handlers the counter calls (decode, photo)
  app/(app)/counter      the counter screen
  app/(app)/log          the day log
  app/(app)/checks/[id]  one check: fields, sources, decision
  app/(app)/queue        the supervisor queue
  components/            VIN strip, form, recall line, status
  kit/                   app shell, call log and pane (brand-free)
  brand/                 the Department's mark and credit
```

### The rules

`lib/registration.ts` runs in the browser as the clerk works and again on
the server when the check is recorded, against the decode the server holds:

- A field the decode leaves empty, or with a value the form has no code for,
  is **entered by hand** and flags the check.
- A field the clerk changes from the decoded value is **changed by hand** and
  flags the check.
- A VIN recorded despite a failed check digit flags the check.
- The make or year on the ownership document differing from the VIN
  **holds** the check: a supervisor must override it, with a reason, or
  return it to the clerk, with a reason. Makes compare without case, spaces
  or punctuation, so `Harley Davidson` matches `Harley-Davidson`; nothing
  else is assumed (`Dodge` is not `Ram`).

`role` is a user field sign-up cannot set. Make someone a supervisor in the
database (`UPDATE user SET role = 'supervisor' WHERE email = ...`).

### What the API does not supply here

- **Display names for the coded fields.** The decode returns entity refs
  (`body-style:truck-tractor`, `gvwr:class-8-…`) and display names only for
  make and model. The app maps refs onto its own code lists, which is what a
  registration form needs anyway; an unmapped ref is a gap for the clerk.
- **A weight class for every vehicle.** `refs.gvwr` is a property of the
  build and is null for many passenger cars and motorcycles (both samples
  here), so the counter asks for it.
- **A check-digit verdict.** The decode can return `valid: true` for a VIN
  whose 9th character is wrong. The counter checks it itself.
- **Recalls for this vehicle.** Recalls are listed by model year, not by
  VIN, and the counter shows only the count, as information.

## Database

```bash
pnpm db:generate   # after editing src/db/schema.ts: write a migration
pnpm db:setup      # apply migrations; seed if empty
pnpm db:reset      # delete the database and start again (stop the dev server first)
```

## Deploy

The app needs a Node server and a disk for SQLite. The `Dockerfile` builds
one container; mount a volume at `/app/data` and set `CARDOG_API_KEY`,
`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. For a serverless host, swap the
Drizzle driver in `src/db/index.ts` for a hosted SQLite or Postgres.

## License

MIT. See [LICENSE](LICENSE).
