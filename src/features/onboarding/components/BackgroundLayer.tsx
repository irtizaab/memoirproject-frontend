"use client";

import { useEffect, useRef } from "react";

import {
  STEP_BACKGROUND,
  STEP_BACKGROUND_OPACITY,
} from "@/features/onboarding/data";
import type { Step } from "@/features/onboarding/types";

import styles from "../onboarding.module.css";

/**
 * Two stacked, always-mounted layers that swap which one holds the incoming
 * photo each time the step changes, so the outgoing photo can fade out while
 * the incoming one fades in over the same `.6s` transition.
 */
export function BackgroundLayer({ step }: { step: Step }) {
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef(false);

  useEffect(() => {
    const a = layerARef.current;
    const b = layerBRef.current;
    if (!a || !b) return;

    const url = STEP_BACKGROUND[step];
    const incoming = flipRef.current ? a : b;
    const outgoing = flipRef.current ? b : a;

    if (!url) {
      a.style.opacity = "0";
      b.style.opacity = "0";
      return;
    }

    incoming.style.backgroundImage = `url(${url})`;
    incoming.style.opacity = String(STEP_BACKGROUND_OPACITY[step] ?? 0.2);
    outgoing.style.opacity = "0";
    flipRef.current = !flipRef.current;
  }, [step]);

  return (
    <>
      <div ref={layerARef} className={styles["bg-layer"]} aria-hidden="true" />
      <div ref={layerBRef} className={styles["bg-layer"]} aria-hidden="true" />
    </>
  );
}
