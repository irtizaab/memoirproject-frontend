"use client";

import { useState } from "react";

/**
 * A label that flashes to a transient value (e.g. "Copied") and reverts after
 * a delay. Backs every fake copy/share affordance in the onboarding flow.
 */
export function useTransientLabel(idleLabel: string) {
  const [label, setLabel] = useState(idleLabel);

  function show(transientLabel: string, delayMs: number) {
    setLabel(transientLabel);
    setTimeout(() => setLabel(idleLabel), delayMs);
  }

  return [label, show] as const;
}
