"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A field label — "Give this memory a title", "What happened?".
 *
 * Sentence case and small, not the tracked-out uppercase used for the eyebrow
 * above a page title. The two are different things: an eyebrow names the
 * screen, a label names the box under it.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 font-sans text-sm leading-none font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
