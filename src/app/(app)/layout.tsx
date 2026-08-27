import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { RequireSession } from "@/components/layout/RequireSession";

/**
 * The chrome around every signed-in screen: header, centred column, footer.
 *
 * A route **group** — the `(app)` folder name is parentheses-wrapped, so it
 * adds a layout without adding a URL segment. `/archive` is still `/archive`.
 *
 * `/onboarding` and `/j/[token]` deliberately sit outside it. Onboarding has
 * no navigation because there is nowhere to navigate to yet, and the
 * contributor page has none because a contributor has no account and never
 * will.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireSession>
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:py-16">
          {children}
        </main>
        <AppFooter />
      </div>
    </RequireSession>
  );
}
