import Link from "next/link";
import { redirect } from "next/navigation";
import { AgencyWordmark, CardogCredit } from "@/brand/dvs";
import { getViewer } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const me = await getViewer();
  if (me) redirect(me.role === "supervisor" ? "/queue" : "/counter");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-band">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center px-4 sm:px-8">
          <Link href="/" aria-label="Department of Vehicle Services, staff home">
            <AgencyWordmark tone="band" sub="Staff sign-in" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[460px] flex-1 px-4 pb-16 pt-10 sm:pt-16">
        <div className="rounded-[8px] border-2 border-ink bg-card p-6 sm:p-8">{children}</div>
      </main>
      <footer className="mx-auto flex w-full max-w-[1080px] justify-end px-4 py-6 sm:px-8">
        <CardogCredit />
      </footer>
    </div>
  );
}
