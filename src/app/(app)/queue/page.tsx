import Link from "next/link";
import { StatusBadge } from "@/components/status";
import { ShowCalls } from "@/kit/call-log";
import { queue, type Check } from "@/lib/checks";
import { requireSupervisor } from "@/lib/session";

export const metadata = { title: "Supervisor queue" };
export const dynamic = "force-dynamic";

function waiting(d: Date) {
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d`;
}

export default async function QueuePage() {
  await requireSupervisor();
  const items = queue();
  const held = items.filter((c) => c.status === "held");
  const flagged = items.filter((c) => c.status === "flagged");

  return (
    <div className="space-y-8">
      <ShowCalls calls={[]} />
      <div>
        <h1 className="text-[1.9rem] font-bold leading-tight sm:text-[2.2rem]">Supervisor queue</h1>
        <p className="mt-1 text-muted">
          {items.length === 0
            ? "Nothing is waiting."
            : `${held.length} need an override, ${flagged.length} flagged for review. Oldest first.`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[8px] border-2 border-dashed border-rule-strong bg-card px-6 py-12 text-center">
          <p className="text-[1.15rem] font-bold">The queue is empty</p>
          <p className="mt-2 text-muted">
            Checks held for an override, or flagged because a field was entered by hand, wait here.
          </p>
          <Link href="/log" className="btn btn-line mt-5">
            Open the day log
          </Link>
        </div>
      ) : (
        <>
          <Group title="Needs an override" hint="The ownership document disagrees with the VIN." items={held} />
          <Group title="Flagged for review" hint="A field was entered or changed by hand, or the check digit failed." items={flagged} />
        </>
      )}
    </div>
  );
}

function Group({ title, hint, items }: { title: string; hint: string; items: Check[] }) {
  return (
    <section>
      <h2 className="text-[1.25rem] font-bold">
        {title} <span className="tabular-nums text-muted">· {items.length}</span>
      </h2>
      <p className="text-[0.92rem] text-muted">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-3 rounded-[8px] border-2 border-dashed border-rule-strong bg-card px-4 py-4 text-muted">None waiting.</p>
      ) : (
        <ol className="mt-3 divide-y divide-rule overflow-hidden rounded-[8px] border-2 border-ink bg-card">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/checks/${c.id}`}
                className="grid gap-x-6 gap-y-2 px-4 py-4 hover:bg-canvas sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold underline underline-offset-4">{c.number}</span>
                    <span>{[c.year, c.make, c.model].filter(Boolean).join(" ")}</span>
                  </span>
                  <span className="mt-1 block font-mono text-[0.88rem] tracking-[0.05em] text-muted">{c.vin}</span>
                  <span className={`mt-2 block text-[0.95rem] ${c.status === "held" ? "font-bold text-stop" : "text-flag"}`}>
                    {c.mismatches[0]
                      ? `${c.mismatches[0].field === "make" ? "Make" : "Year"}: document says ${c.mismatches[0].document}, VIN says ${c.mismatches[0].vin}`
                      : c.flags[0]?.reason}
                    {c.mismatches.length + c.flags.length > 1 && (
                      <span className="font-normal text-muted"> · and {c.mismatches.length + c.flags.length - 1} more</span>
                    )}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <StatusBadge status={c.status} short />
                  <span className="text-[0.88rem] text-muted">
                    {c.clerkName} · waiting {waiting(c.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
