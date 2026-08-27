import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * The block every screen opens with: a small red eyebrow, a serif title, a
 * grey line of explanation, then a hairline rule.
 *
 * It is a component rather than four hand-built copies because it is the thing
 * that makes the screens feel like one product — if the gap under the title
 * drifts on one page, the whole set stops looking designed.
 *
 * `action` is the optional control that sits to the right of the title, like
 * "New memory" on the archive.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  /** Small uppercase label, e.g. "BILLING". Rendered in seal red. */
  eyebrow: string;
  title: string;
  /** One or two lines under the title. Optional — some screens need none. */
  description?: ReactNode;
  /** A button aligned to the right of the title row. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-5", className)}>
      <div className="space-y-3">
        <p className="eyebrow">{eyebrow}</p>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-heading text-[clamp(26px,4vw,34px)] leading-tight font-normal tracking-tight text-balance">
              {title}
            </h1>
            {description && (
              <div className="max-w-xl font-sans text-sm leading-relaxed text-muted-foreground text-pretty">
                {description}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      <Separator />
    </header>
  );
}
