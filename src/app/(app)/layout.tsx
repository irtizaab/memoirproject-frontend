import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { RequireSession } from "@/components/layout/RequireSession";

/**
 * The chrome around every signed-in screen: header, page, footer.
 *
 * A route **group** — the `(app)` folder name is parentheses-wrapped, so it
 * adds a layout without adding a URL segment. `/archive` is still `/archive`.
 *
 * `/onboarding` and `/j/[token]` deliberately sit outside it. Onboarding has
 * no navigation because there is nowhere to navigate to yet, and the
 * contributor page has none because a contributor has no account and never
 * will.
 *
 * `main` is deliberately **full-bleed**. It used to be a centred `max-w-7xl`
 * column, which meant no screen could draw a band that runs edge to edge — and
 * a band is the whole structure of the redesign: a `--paper-deep` title band
 * with a rule under it, then the ordinary page. Width is now the screen's own
 * business, and `PageHeader`/`PageBody` are what centre it, so the 1024px
 * measure is still declared in exactly one pair of places.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireSession>
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </div>
    </RequireSession>
  );
}
