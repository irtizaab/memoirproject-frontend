import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/*
 * Taller and quieter than the shadcn default. The audience for this product
 * skews older and often fills these in on a phone, so the box is a comfortable
 * 44px and the text is 16px — below that, iOS Safari zooms the page on focus.
 *
 * Focus is a seal-red outline rather than a glow ring, matching the outline
 * treatment used everywhere else in the design.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 py-2 font-sans text-base transition-colors outline-none placeholder:text-ink-faint focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
