"use client";

import { CHAPTERS } from "@/features/onboarding/data";

import styles from "../onboarding.module.css";

type ReviewStepProps = {
  onSave: () => void;
  onPublish: () => void;
};

export function ReviewStep({ onSave, onPublish }: ReviewStepProps) {
  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <h2 className={styles.ask}>Six chapters.</h2>
      <p className={styles["ask-sub"]}>
        These are proposals. Rewrite any title, and nothing is fixed until
        you publish.
      </p>
      <div className={styles.chaps}>
        {CHAPTERS.map(([title, meta, flag], i) => (
          <div key={title} className={styles.chap}>
            <div className={styles["chap-i"]}>{i + 1}</div>
            <div className={styles["chap-b"]}>
              <input
                className={styles["chap-t"]}
                defaultValue={title}
                aria-label={`Chapter ${i + 1} title`}
              />
              <div className={styles["chap-m"]}>
                {meta}
                {flag && <span className={styles["chap-flag"]}> · {flag}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-text"]}`}
          onClick={onSave}
        >
          Save and come back
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          onClick={onPublish}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
