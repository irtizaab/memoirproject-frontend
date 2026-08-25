"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import styles from "../onboarding.module.css";

const ITEM_HEIGHT = 44;

type YearWheelProps = {
  id: string;
  label: string;
  values: string[];
  initialIndex: number;
  wheelRef: RefObject<HTMLDivElement | null>;
  onPick?: (value: string, index: number) => void;
};

/**
 * A scroll-snap picker. `wheelRef` is exposed to the parent so a commit
 * action can read the live scroll position directly, rather than trusting
 * the debounced `onPick` to have already settled.
 */
export function YearWheel({
  id,
  label,
  values,
  initialIndex,
  wheelRef,
  onPick,
}: YearWheelProps) {
  const [midIndex, setMidIndex] = useState(initialIndex);
  const lockRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    el.scrollTop = initialIndex * ITEM_HEIGHT;
    lockRef.current = true;
    const unlock = setTimeout(() => {
      lockRef.current = false;
    }, 120);
    return () => clearTimeout(unlock);
    // Runs once when this wheel mounts, matching the prototype's one-time
    // `initWheels` setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = wheelRef.current;
    if (!el) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const i = Math.max(
        0,
        Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)),
      );
      setMidIndex(i);
      if (!lockRef.current) onPick?.(values[i], i);
    }, 90);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const el = wheelRef.current;
    if (!el) return;
    const i =
      Math.round(el.scrollTop / ITEM_HEIGHT) + (e.key === "ArrowDown" ? 1 : -1);
    el.scrollTo({
      top: Math.max(0, Math.min(values.length - 1, i)) * ITEM_HEIGHT,
      behavior: "smooth",
    });
  }

  function handleItemClick(i: number) {
    wheelRef.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
  }

  const labelId = `l-${id}`;

  return (
    <div className={styles["wheel-col"]}>
      <label id={labelId}>{label}</label>
      <div className={styles["wheel-wrap"]}>
        <div
          ref={wheelRef}
          className={styles.wheel}
          tabIndex={0}
          role="listbox"
          aria-labelledby={labelId}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {values.map((value, i) => (
            <div
              key={value}
              role="option"
              aria-selected={i === midIndex}
              className={`${styles["wheel-item"]} ${i === midIndex ? styles.mid : ""}`}
              onClick={() => handleItemClick(i)}
            >
              {value}
            </div>
          ))}
        </div>
        <div className={styles["wheel-band"]} />
      </div>
    </div>
  );
}
