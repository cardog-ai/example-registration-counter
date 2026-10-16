import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status";
import { ShowCalls } from "@/kit/call-log";
import { earlierChecks, getCheck } from "@/lib/checks";
import { FIELDS, labelFor } from "@/lib/registration";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Check" };

const when = (d: Date) =>
  d.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireViewer();
  const c = getCheck((await params).id);
  if (!c) notFound();
  const earlier = earlierChecks(c.vin, c.id);
  const vehicle = [c.year, c.make, c.model].filter(Boolean).join(" ");
  const back = me.role === "supervisor" && (c.status === "held" || c.status === "flagged") ? "/queue" : `/log?day=${c.day}`;

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <ShowCalls calls={c.calls} />
      <Link href={back} className="link font-bold">
        ← {back === "/queue" ? "Supervisor queue" : "Day log"}
      </Link>

      <header className="rounded-[8px] border-2 border-ink bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.6rem] font-bold leading-tight sm:text-[1.9rem]">{c.number}</h1>
          <StatusBadge status={c.status} />
        </div>
        <p className="mt-3 break-all font-mono text-[1.4rem] font-bold tracking-[0.16em] sm:text-[1.7rem]">{c.vin}</p>
        <p className="mt-2 text-muted">
          {vehicle || "Vehicle not decoded"} · {c.clerkName} · {when(c.createdAt)}
        </p>
        <p className={`mt-3 font-bold ${c.checkDigit === "ok" ? "text-good" : "text-stop"}`}>
          {c.checkDigit === "ok" ? "Check digit passes." : "Check digit fails. Recorded as typed."}
        </p>
      </header>

      {(c.mismatches.length > 0 || c.flags.length > 0) && (
        <section className={`rounded-[8px] border-2 bg-card p-4 sm:p-5 ${c.mismatches.length ? "border-stop" : "border-flag-edge"}`}>
          <h2 className="text-[1.15rem] font-bold">Why a supervisor sees this check</h2>
          <ul className="mt-3 space-y-2">
            {c.mismatches.map((m) => (
              <li key={m.field} className="rounded-[6px] border-l-[6px] border-stop bg-stop-wash px-3 py-2 font-bold text-stop">
                {m.field === "make" ? "Make" : "Year"} differs: the document says {m.document}, the VIN says {m.vin}.
              </li>
            ))}
            {c.flags.map((f) => (
              <li key={f.field + f.reason} className="rounded-[6px] border-l-[6px] border-flag-edge bg-flag-wash px-3 py-2 text-flag">
                {f.reason}
              </li>
            ))}
          </ul>
          {c.clerkNote && (
            <div className="mt-4">
              <p className="text-[0.85rem] font-bold text-muted">Clerk&rsquo;s note</p>
              <p className="mt-1 whitespace-pre-wrap">{c.clerkNote}</p>
            </div>
          )}
        </section>
      )}

      {c.decidedAt && (
        <section className={`rounded-[8px] border-2 bg-card p-4 sm:p-5 ${c.status === "approved" ? "border-good" : "border-stop"}`}>
          <h2 className="text-[1.15rem] font-bold">
            {c.status === "approved" ? (c.mismatches.length ? "Overridden by a supervisor" : "Accepted by a supervisor") : "Returned to the clerk"}
          </h2>
          <p className="mt-1 text-muted">
            {c.decidedBy} · {when(c.decidedAt)}
          </p>
          <p className="mt-3 whitespace-pre-wrap">{c.decisionReason}</p>
        </section>
      )}

      <section className="overflow-hidden rounded-[8px] border-2 border-ink bg-card">
        <h2 className="border-b-2 border-ink px-4 py-3 text-[1.05rem] font-bold sm:px-5">Vehicle details as recorded</h2>
        <dl>
          {FIELDS.map((f, i) => {
            const x = c.fields[f.key];
            const conflict = c.mismatches.some((m) => m.field === f.key);
            const bar = conflict ? "bg-stop" : x.source === "vin" ? "bg-act" : "bg-flag-edge";
            return (
              <div key={f.key} className={`relative grid gap-x-4 gap-y-1 py-3 pl-5 pr-4 sm:grid-cols-[12rem_minmax(0,1fr)_10rem] sm:pl-6 ${i ? "border-t border-rule" : ""}`}>
                <span aria-hidden className={`absolute inset-y-0 left-0 w-[6px] ${bar}`} />
                <dt className="font-bold">{f.label}</dt>
                <dd className="text-[1.05rem]">
                  {labelFor(f.key, x.value) ?? "—"}
                  {x.source === "changed" && (
                    <span className="block text-[0.88rem] text-flag">The VIN says {labelFor(f.key, x.decoded)}</span>
                  )}
                </dd>
                <dd className={`text-[0.88rem] font-bold ${conflict ? "text-stop" : x.source === "vin" ? "text-good" : "text-flag"}`}>
                  {conflict ? "Document differs" : x.source === "vin" ? "From the VIN" : x.source === "changed" ? "Changed by hand" : "Entered by hand"}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="grid gap-px border-t-2 border-ink bg-rule sm:grid-cols-2">
          <p className="bg-card px-5 py-3">
            <span className="block text-[0.85rem] font-bold text-muted">Make on the document</span>
            {c.stated.make}
          </p>
          <p className="bg-card px-5 py-3">
            <span className="block text-[0.85rem] font-bold text-muted">Year on the document</span>
            {c.stated.year}
          </p>
        </div>
      </section>

      <section className="rounded-[8px] bg-info-wash p-4 text-info sm:p-5">
        <h2 className="font-bold">
          Recalls issued for this model and year{vehicle ? ` (${vehicle})` : ""}: {c.recalls ? c.recalls.total : "not read"}
        </h2>
        <p className="mt-1 text-[0.9rem]">
          For information only. Campaigns are listed by model year, not by this vehicle, and are not part of the registration.
        </p>
        {c.recalls && c.recalls.campaigns.length > 0 && (
          <ul className="mt-3 divide-y divide-info/20 text-[0.9rem]">
            {c.recalls.campaigns.map((r) => (
              <li key={r.authorityLabel + r.campaignNumber} className="flex flex-wrap justify-between gap-x-4 py-2">
                <span>
                  <span className="font-bold">{r.authorityLabel}</span> {r.campaignNumber}
                  {r.component ? ` · ${r.component}` : ""}
                </span>
                <span className="tabular-nums">{r.recallDate ?? ""}</span>
              </li>
            ))}
            {c.recalls.total > c.recalls.campaigns.length && (
              <li className="py-2">The newest {c.recalls.campaigns.length} of {c.recalls.total} are shown.</li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-[8px] border-2 border-ink bg-card p-4 sm:p-5">
        <h2 className="text-[1.05rem] font-bold">Earlier checks of this VIN</h2>
        {earlier.length === 0 ? (
          <p className="mt-2 text-muted">None. This is the first time the counter has checked this VIN.</p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {earlier.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <Link href={`/checks/${e.id}`} className="link font-bold">
                  {e.number}
                </Link>
                <span className="text-muted">{when(e.createdAt)} · {e.clerkName}</span>
                <StatusBadge status={e.status} short />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
