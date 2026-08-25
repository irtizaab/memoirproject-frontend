"use client";

import { PLANS } from "@/features/onboarding/data";
import type { OnboardingState } from "@/features/onboarding/types";

import styles from "../onboarding.module.css";

type PayStepProps = {
  state: OnboardingState;
  onBack: () => void;
  onNext: () => void;
};

export function PayStep({ state, onBack, onNext }: PayStepProps) {
  const [term, , amount] =
    PLANS.find(([t]) => t === state.term) ?? PLANS[0];

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
      <h2 className={styles.ask}>Payment details</h2>
      <p className={styles["ask-sub"]}>
        ${amount} {term}, starting today.
      </p>
      <div className={styles.pay}>
        <div className={styles.field}>
          <label htmlFor="p-num">Card number</label>
          <input
            id="p-num"
            className={styles["rule-input"]}
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
          />
        </div>
        <div className={styles["pay-row"]}>
          <div className={styles.field}>
            <label htmlFor="p-exp">Expiry</label>
            <input
              id="p-exp"
              className={styles["rule-input"]}
              placeholder="09 / 29"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="p-cvc">CVC</label>
            <input
              id="p-cvc"
              className={styles["rule-input"]}
              placeholder="123"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="p-name">Name on card</label>
          <input
            id="p-name"
            className={styles["rule-input"]}
            placeholder="Amina Sethi"
          />
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
          onClick={onNext}
        >
          Start subscription
        </button>
      </div>
      <div className={styles.footnote}>
        Handled by Paddle. We never see your card.
      </div>
    </div>
  );
}
