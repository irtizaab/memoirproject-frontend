import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A filled bar showing one quantity against a limit — the archive storage
 * meter on the billing screen.
 *
 * Deliberately not a general "progress" indicator. The product forbids
 * completion percentages and progress towards goals; this measures how full a
 * container is, which is a fact about storage, not a score. Do not reach for
 * it to show how "complete" a memoir is.
 *
 * Rendered as a native `<progress>`-equivalent pair of divs with the ARIA
 * roles set explicitly, so a screen reader announces the real numbers rather
 * than a bar.
 */
function Meter({
  value,
  max,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** Amount used, in the same unit as `max`. */
  value: number
  /** The limit. Values above it clamp — the bar never overflows. */
  max: number
  /** Announced to assistive tech, e.g. "3.2 GB of 10 GB used". */
  label: string
}) {
  const safeMax = max > 0 ? max : 1
  const ratio = Math.min(Math.max(value / safeMax, 0), 1)

  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-rule",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-seal transition-[width] duration-500"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

export { Meter }
