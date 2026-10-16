import Link from "next/link";
import { AppShell } from "@/kit/app-shell";
import { AgencyWordmark, CardogCredit } from "@/brand/dvs";
import { dataMode } from "@/lib/cardog";
import { requireViewer } from "@/lib/session";
import { AccountMenu } from "./account-menu";
import { Tabs, type Tab } from "./tabs";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const me = await requireViewer();
  const tabs: Tab[] = [
    { href: "/counter", label: "Counter", key: "c" },
    { href: "/log", label: "Day log", key: "l" },
  ];
  return (
    <AppShell
      mode={dataMode}
      brand={
        <Link href="/counter" aria-label="Registration counter">
          <AgencyWordmark tone="band" sub="Registration counter" />
        </Link>
      }
      tabs={<Tabs tabs={tabs} />}
      account={<AccountMenu name={me.name} role={me.role} />}
      footer={
        <div className="flex items-center justify-between border-t-2 border-rule pt-4 text-[0.78rem] text-muted">
          <span>Department of Vehicle Services · staff use only</span>
          <CardogCredit />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
