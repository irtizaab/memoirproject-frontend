"use client";

import { useState } from "react";

import styles from "../onboarding.module.css";

export function LandingStep({ onPledge }: { onPledge: () => void }) {
  const [sealing, setSealing] = useState(false);

  function takePledge() {
    setSealing(true);
    setTimeout(() => {
      onPledge();
      setSealing(false);
    }, 640);
  }

  return (
    <div className={`${styles.pledge} ${styles.step}`}>
      <div className={styles.eyebrow}>The Memoir Project</div>
      <h1>
        Before we begin,
        <br />
        one <em>promise</em>.
      </h1>
      <div className={styles["pledge-body"]}>
        A memoir is only worth keeping if it&apos;s true. What goes in here
        will outlast everyone who put it there.
      </div>
      <div className={styles["pledge-rule"]} />
      <div className={styles.vow}>
        &quot;I will be truthful about what I remember, and I will let others
        be truthful about what they remember.&quot;
      </div>
      <button
        type="button"
        className={`${styles.btn} ${styles["btn-primary"]} ${styles["pledge-btn"]} ${sealing ? styles.sealing : ""}`}
        onClick={takePledge}
      >
        <span className={styles.fill} />
        <span className={styles.lbl}>I pledge to be truthful</span>
      </button>
    </div>
  );
}
