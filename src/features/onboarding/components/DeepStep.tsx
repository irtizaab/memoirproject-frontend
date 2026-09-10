"use client";

import { firstName } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";

type DeepStepProps = {
  name: string;
  deep: string;
  onChange: (deep: string) => void;
  onNext: () => void;
};

export function DeepStep({ name, deep, onChange, onNext }: DeepStepProps) {
  return (
    <div className={styles.step}>
      <h2 className={styles.ask}>
        What should never be forgotten about {firstName(name)}?
      </h2>
      <p className={styles["ask-sub"]}>
        One thing. It becomes the first question your family is asked, so start
        them where you&apos;d start.
      </p>
      <div className={styles.field}>
        <label htmlFor="f-deep">In a line</label>
        <input
          id="f-deep"
          className={styles["rule-input"]}
          style={{ fontSize: 21 }}
          placeholder="He fed the whole street during the floods"
          value={deep}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-text"]}`}
          onClick={onNext}
        >
          Leave this for now
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          onClick={onNext}
        >
          Keep this safe
        </button>
      </div>
    </div>
  );
}
