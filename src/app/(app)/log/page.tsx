import Link from "next/link";
import { StatusBadge, type CheckStatus } from "@/components/status";
import { ShowCalls } from "@/kit/call-log";
import { checksOn, daysWithChecks, today } from "@/lib/checks";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Day log" };

const STATUSES: CheckStatus[] = ["clear", "flagged", "held", "approved", "returned"];

function shiftDay(day: string, by: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + by);
  return d.toLocaleDateString("en-CA");
}
const longDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const time = (d: Date) => d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

export default async function DayLogPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requireViewer();
  const now = today();
  const asked = (await searchParams).day;
  const day = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : now;
  const checks = checksOn(day);
  const days = daysWithChecks();
  const count = (s: CheckStatus) => checks.filter((c) => c.status === s).length;

  return (
    <div className="space-y-6">
      <ShowCalls calls={[]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.9rem] font-bold leading-tight sm:text-[2.2rem]">Day log</h1>
          <p className="mt-1 text-muted">{longDay(day)}{day === now ? " · today" : ""}</p>
        </div>
        <nav aria-label="Choose a day" className="flex flex-wrap items-center gap-2">
          <Link href={`/log?day=${shiftDay(day, -1)}`} className="btn btn-line h-11" rel="prev">
            ← Previous day
          </Link>
          {day < now && (
            <Link href={`/log?day=${shiftDay(day, 1)}`} className="btn btn-line h-11" rel="next">
              Next day →
            </Link>
          )}
          <form action="/log" className="flex items-center gap-2">
            <label htmlFor="day" className="sr-only">
              Day
            </label>
            <select id="day" name="day" defaultValue={day} className="field h-11 w-auto">
              {!days.some((d) => d.day === day) && <option value={day}>{day} · 0</option>}
              {days.map((d) => (
                <option key={d.day} value={d.day}>
                  {d.day} · {d.n}
                </option>
              ))}
            </select>
            <button className="btn btn-line h-11">Show</button>
          </form>
        </nav>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border-2 border-ink bg-ink sm:grid-cols-6">
        <div className="bg-card px-4 py-3">
          <dt className="text-[0.85rem] text-muted">Checks</dt>
          <dd className="text-[1.6rem] font-bold tabular-nums">{checks.length}</dd>
        </div>
        {STATUSES.map((s) => (
          <div key={s} className="bg-card px-4 py-3">
            <dt className="text-[0.85rem] text-muted">{{ clear: "Clear", flagged: "Flagged", held: "Override", approved: "Approved", returned: "Returned" }[s]}</dt>
            <dd className="text-[1.6rem] font-bold tabular-nums">{count(s)}</dd>
          </div>
        ))}
      </dl>

      {checks.length === 0 ? (
        <div className="rounded-[8px] border-2 border-dashed border-rule-strong bg-card px-6 py-12 text-center">
          <p className="text-[1.15rem] font-bold">No checks on this day</p>
          <p className="mt-2 text-muted">Checks recorded at the counter appear here, newest first.</p>
          {day === now && (
            <Link href="/counter" className="btn btn-act mt-5">
              Go to the counter
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border-2 border-ink bg-card">
          <table className="hidden w-full border-collapse text-left md:table">
            <thead>
              <tr className="border-b-2 border-ink text-[0.85rem] text-muted">
                <th className="px-4 py-3 font-bold">Time</th>
                <th className="px-4 py-3 font-bold">Check</th>
                <th className="px-4 py-3 font-bold">Vehicle</th>
                <th className="px-4 py-3 font-bold">Clerk</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-t border-rule first:border-t-0 hover:bg-canvas">
                  <td className="px-4 py-3 tabular-nums">{time(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/checks/${c.id}`} className="link font-bold">
                      {c.number}
                    </Link>
                    <span className="block font-mono text-[0.85rem] tracking-[0.06em] text-muted">{c.vin}</span>
                  </td>
                  <td className="px-4 py-3">{[c.year, c.make, c.model].filter(Boolean).join(" ")}</td>
                  <td className="px-4 py-3">{c.clerkName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} short />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-rule md:hidden">
            {checks.map((c) => (
              <li key={c.id}>
                <Link href={`/checks/${c.id}`} className="block px-4 py-3 hover:bg-canvas">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold underline underline-offset-4">{c.number}</span>
                    <span className="tabular-nums text-muted">{time(c.createdAt)}</span>
                  </span>
                  <span className="mt-1 block">{[c.year, c.make, c.model].filter(Boolean).join(" ")}</span>
                  <span className="mt-1 block font-mono text-[0.85rem] tracking-[0.04em] text-muted">{c.vin}</span>
                  <span className="mt-2 flex items-center justify-between gap-3">
                    <StatusBadge status={c.status} short />
                    <span className="text-[0.88rem] text-muted">{c.clerkName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
