import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The hairline rule that divides a page header from its body, and one section
 * from the next.
 *
 * It appears on every screen in the design and carries no meaning beyond
 * "these are separate", so it defaults to `aria-hidden` — announcing a
 * decorative line to a screen reader is noise. Pass `decorative={false}` on
 * the rare rule that genuinely separates two lists.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) {
  return (
    <div
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
