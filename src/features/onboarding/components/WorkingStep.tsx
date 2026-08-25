"use client";

import { useEffect, useState } from "react";

import { WORK_MESSAGES } from "@/features/onboarding/data";

import styles from "../onboarding.module.css";

export function WorkingStep({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= WORK_MESSAGES.length) {
        clearInterval(interval);
        onDone();
        return;
      }
      setIndex(i);
    }, 1500);
    return () => clearInterval(interval);
    // Runs once for the lifetime of this step. `onDone` navigates away,
    // unmounting this component, so a stale closure over it is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles.working}>
        <div className={styles["work-mark"]} />
        <div className={styles["work-line"]}>{WORK_MESSAGES[index]}</div>
      </div>
      <div className={styles.footnote}>
        This takes a few minutes. You can close this and come back —
        we&apos;ll email you when it&apos;s ready.
      </div>
    </div>
  );
}
