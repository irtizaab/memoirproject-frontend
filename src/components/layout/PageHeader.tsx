import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The band every screen opens with: a full-bleed strip of `--paper-deep` with a
 * hairline under it, holding a small red eyebrow, a serif title and a grey line
 * of explanation.
 *
 * It is a band rather than a block of text on the page because that is the
 * structure of the whole product: a page is bands at different weights, not
 * sections at one. The rule under it is the band's own bottom border — there is
 * no separate `<Separator />` any more, and adding one back puts two lines a few
 * pixels apart.
 *
 * It is a component rather than ten hand-built copies because it is the thing
 * that makes the screens feel like one product — if the gap under the title
 * drifts on one page, the whole set stops looking designed.
 *
 * `action` is the optional control that sits to the right of the title, like
 * "Copy the invite link" on the contributors screen.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  /** Small uppercase label, e.g. "Billing". Rendered in seal red. */
  eyebrow: string;
  title: string;
  /** One or two lines under the title. Optional — some screens need none. */
  description?: ReactNode;
  /** A control aligned to the right of the title row. */
  action?: ReactNode;
  /**
   * Anything the band should carry under the title — a statistics row, a set of
   * counts. Rare; most screens pass nothing.
   */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border bg-paper-deep", className)}>
      <div className="mx-auto w-full max-w-5xl px-6 py-8 md:py-9">
        <header>
          <p className="eyebrow">{eyebrow}</p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-[clamp(26px,4vw,32px)] leading-tight font-normal tracking-tight text-balance">
                {title}
              </h1>
              {description && (
                <div className="mt-2.5 max-w-[62ch] font-sans text-sm leading-relaxed text-muted-foreground text-pretty">
                  {description}
                </div>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
