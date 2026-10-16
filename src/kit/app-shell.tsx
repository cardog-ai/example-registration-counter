/**
 * The signed-in frame: a black band (brand, account, the API pill on a
 * phone), a tab row, the page, and the "What the app called" column on
 * desktop.
 *
 * Brand-free on purpose: the brand, tabs and account come in as slots and
 * the colours come from the theme tokens in app/globals.css, so the next
 * sample app can take this file unchanged and look like itself.
 */

import { CallLogProvider } from "./call-log";
import { CallsPane, CallsSheetToggle } from "./calls-pane";

export function AppShell({
  brand,
  tabs,
  account,
  footer,
  mode,
  children,
}: {
  brand: React.ReactNode;
  tabs?: React.ReactNode;
  account?: React.ReactNode;
  footer?: React.ReactNode;
  mode: "live" | "fixture";
  children: React.ReactNode;
}) {
  return (
    <CallLogProvider mode={mode}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-20">
            <div className="bg-band">
              <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-4 px-4 sm:px-6">
                <div className="min-w-0">{brand}</div>
                <div className="flex shrink-0 items-center gap-3">
                  <CallsSheetToggle />
                  {account}
                </div>
              </div>
            </div>
            {tabs && (
              <div className="border-b-2 border-ink bg-card">
                <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1040px] items-stretch gap-1 overflow-x-auto px-2 sm:px-4">
                  {tabs}
                </nav>
              </div>
            )}
          </header>
          <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
          {footer && <footer className="mx-auto w-full max-w-[1040px] px-4 pb-6 sm:px-6">{footer}</footer>}
        </div>
        <aside className="sticky top-0 hidden h-dvh lg:block">
          <CallsPane />
        </aside>
      </div>
    </CallLogProvider>
  );
}
