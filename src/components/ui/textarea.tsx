import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The box people actually write their memories into.
 *
 * Generous by default — six rows rather than three — because the first thing a
 * text box says is how much you are expected to write, and a cramped one asks
 * for a sentence. Resizing stays enabled vertically for anyone who wants more.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={6}
      className={cn(
        "field-sizing-content min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 font-sans text-base leading-relaxed transition-colors outline-none placeholder:text-ink-faint focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
