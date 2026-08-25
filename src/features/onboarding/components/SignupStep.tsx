"use client";

import type { OnboardingState } from "@/features/onboarding/types";

import styles from "../onboarding.module.css";
import { BookCover } from "./BookCover";

type SignupStepProps = {
  state: OnboardingState;
  onBack: () => void;
  onNext: () => void;
};

export function SignupStep({ state, onBack, onNext }: SignupStepProps) {
  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["sheet-top"]}>
        <button
          type="button"
          className={`${styles.back} ${styles.on}`}
          onClick={onBack}
        >
          ← Back
        </button>
        <span />
      </div>
      <div className={styles["cover-wrap"]}>
        <BookCover
          name={state.name}
          born={state.born}
          bornSet={state.bornSet}
          through={state.through}
        />
      </div>
      <h2
        className={styles.ask}
        style={{ fontSize: "clamp(24px,4vw,32px)", marginTop: 34 }}
      >
        Keep this safe
      </h2>
      <p className={styles["ask-sub"]}>
        Nothing is saved yet. Everyone you invite gets in by link —
        you&apos;re the only one who ever needs an account.
      </p>
      <div className={styles.stack}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-outline"]} ${styles["btn-block"]}`}
          onClick={onNext}
        >
          Continue with Google
        </button>
        <div className={styles.divider}>or</div>
        <div className={styles.field}>
          <label htmlFor="f-email">Your email</label>
          <input
            id="f-email"
            className={styles["rule-input"]}
            type="email"
            placeholder="you@example.com"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="f-pass">Choose a password</label>
          <input
            id="f-pass"
            className={styles["rule-input"]}
            type="password"
            placeholder="••••••••"
          />
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
          onClick={onNext}
        >
          Save the memoir
        </button>
      </div>
    </div>
  );
}
