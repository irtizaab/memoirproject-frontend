import { RequireSession } from "@/components/layout/RequireSession";

/**
 * The owner's preview is signed-in-only, and carries no app chrome.
 *
 * It sits outside the `(app)` group for the same reason `/m/[token]` does: the
 * reader has its own masthead, its own contents rail and four columns, and the
 * signed-in header stacked above all that would be two headers arguing about
 * which book you are in. What it does need from `(app)` is the session guard,
 * so that is the one thing borrowed — a signed-out visitor sees onboarding
 * rather than a screenful of failed requests.
 */
export default function PreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RequireSession>{children}</RequireSession>;
}
