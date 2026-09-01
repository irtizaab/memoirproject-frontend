"use client";

import { chargeSummary, usePlans, useSelectPlan } from "@/features/billing";
import type { OnboardingState } from "@/features/onboarding/types";

import styles from "../onboarding.module.css";

type PayStepProps = {
  state: OnboardingState;
  onBack: () => void;
  /** Leaves onboarding for the archive. The last thing this flow does. */
  onDone: () => void;
};

/**
 * The last screen before the product.
 *
 * The card fields are a placeholder — no processor is wired up, and nothing
 * typed here is sent anywhere. Stripe replaces the body of this component in
 * the payment pass; the step, its position in the flow, and where it hands off
 * to are already correct.
 *
 * What it does do is record which term was chosen, so the billing screen
 * quotes the same one back. That is an entitlement, not a charge: the account
 * still reports `payments_enabled: false` with no renewal date.
 */
export function PayStep({ state, onBack, onDone }: PayStepProps) {
  const { data: plans } = usePlans();
  const selectPlan = useSelectPlan();

  const selected =
    plans?.find((plan) => plan.billing_interval === state.term) ?? plans?.[0];

  async function start() {
    // Awaited so the billing screen is consistent the moment it is opened, but
    // failure does not block the exit: the account is already on a valid plan,
    // and stranding someone at the last step of onboarding over a cosmetic
    // mismatch would be the worse trade.
    if (selected) {
      try {
        await selectPlan.mutateAsync(selected.code);
      } catch {
        // Intentionally swallowed — see above.
      }
    }
    onDone();
  }

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["sheet-top"]}>
        <button
          type="button"
          className={`${styles.back} ${styles.on}`}
          onClick={onBack}
          disabled={selectPlan.isPending}
        >
          ← Back
        </button>
        <span />
      </div>
      <h2 className={styles.ask}>Payment details</h2>
      <p className={styles["ask-sub"]}>
        {selected
          ? `${chargeSummary(selected)}, starting today.`
          : "Starting today."}
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
          onClick={start}
          disabled={selectPlan.isPending}
        >
          {selectPlan.isPending ? "One moment…" : "Start subscription"}
        </button>
      </div>
      <div className={styles.footnote}>
        Handled by Paddle. We never see your card.
      </div>
    </div>
  );
}
