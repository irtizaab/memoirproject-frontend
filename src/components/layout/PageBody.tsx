import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The page under the band: the same 1024px measure, on the ordinary ground.
 *
 * Five lines rather than seven copies of the same three utilities, for the
 * reason `PageHeader` gives about itself — a measure that drifts by one screen
 * is how a set of pages stops looking like one product.
 */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-6 py-10 md:py-12", className)}
    >
      {children}
    </div>
  );
}
