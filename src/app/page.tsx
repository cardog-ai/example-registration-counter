import Link from "next/link";
import { redirect } from "next/navigation";
import { AgencyWordmark, CardogCredit } from "@/brand/dvs";
import { getViewer } from "@/lib/session";

/** The staff front door. Signed-in staff go straight to their screen. */
export default async function Home() {
  const me = await getViewer();
  if (me) redirect(me.role === "supervisor" ? "/queue" : "/counter");

  const steps = [
    ["Type or scan the VIN", "The check digit is worked out as the characters go in."],
    ["The form fills itself", "Year, make, model, body, fuel, weight class and vehicle type, from the VIN."],
    ["Gaps are marked, not guessed", "Anything the VIN does not say is left for you to enter by hand."],
    ["Differences go to a supervisor", "If the ownership document disagrees with the VIN, a supervisor decides."],
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-band">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-8">
          <AgencyWordmark tone="band" sub="Registration counter" />
          <Link href="/sign-in" className="hidden font-bold text-band-text underline underline-offset-4 sm:inline">
            Staff sign-in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 pb-16 pt-12 sm:px-8 sm:pt-20">
        <p className="font-bold text-muted">For counter staff</p>
        <h1 className="mt-2 max-w-[18ch] text-[2.4rem] font-bold leading-[1.08] tracking-[-0.015em] sm:text-[3.2rem]">
          The VIN check at the registration counter
        </h1>
        <p className="mt-5 max-w-[56ch] text-[1.1rem] text-ink-2">
          One field to type or scan. The vehicle&rsquo;s registration details come from the VIN, so the counter checks
          the paperwork against the vehicle instead of copying it out.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-in" className="btn btn-act">
            Sign in
          </Link>
          <Link href="/sign-up" className="btn btn-line">
            Create a clerk account
          </Link>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-[8px] border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="bg-card p-6">
              <p className="font-mono text-[0.85rem] font-bold text-muted">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-[1.1rem] font-bold leading-snug">{title}</p>
              <p className="mt-2 text-[0.95rem] text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </main>
      <footer className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-4 py-6 text-[0.78rem] text-muted sm:px-8">
        <span>Department of Vehicle Services</span>
        <CardogCredit />
      </footer>
    </div>
  );
}
