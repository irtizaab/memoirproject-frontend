"use client";

import { useState } from "react";

import { FEATURES, PLANS } from "@/features/onboarding/data";
import type { OnboardingState, PlanTerm } from "@/features/onboarding/types";
import { firstName, possessive } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";
import { BookCover } from "./BookCover";

const TICK_PATH = "M4 12.5l5.5 5.5L20 7";

type PricingStepProps = {
  state: OnboardingState;
  onChangeTerm: (term: PlanTerm) => void;
  onNext: () => void;
};

export function PricingStep({
  state,
  onChangeTerm,
  onNext,
}: PricingStepProps) {
  const [agreed, setAgreed] = useState(false);
  const [, , amount, per, note] =
    PLANS.find(([term]) => term === state.term) ?? PLANS[0];
  const possessiveName = possessive(firstName(state.name));

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles.plan}>
        <div className={styles["plan-left"]}>
          <BookCover
            name={state.name}
            born={state.born}
            bornSet={state.bornSet}
            through={state.through}
          />
          <div className={styles["plan-name"]}>{possessiveName} memoir</div>
          <div className={styles["plan-tag"]}>
            Kept for as long as anyone wants to visit it.
          </div>

          <div className={styles.seg}>
            {PLANS.map(([term, label]) => (
              <button
                key={term}
                type="button"
                className={`${styles["seg-o"]} ${state.term === term ? styles.sel : ""}`}
                onClick={() => onChangeTerm(term)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles["big-price"]}>
            <span className={styles.cur}>$</span>
            <span className={styles.amt}>{amount}</span>
            <span className={styles.per}>{per}</span>
          </div>
          <div className={styles["price-note"]}>{note}</div>

          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
            disabled={!agreed}
            onClick={onNext}
          >
            Begin {possessiveName} memoir
          </button>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I agree to the <u>terms and conditions</u>
            </span>
          </label>
        </div>

        <div className={styles["plan-right"]}>
          <ul className={styles.feats}>
            {FEATURES.map(([title, description]) => (
              <li key={title}>
                <svg viewBox="0 0 24 24">
                  <path d={TICK_PATH} />
                </svg>
                <span>
                  <span className={styles["feat-t"]}>{title}</span>
                  <span className={styles["feat-d"]}>{description}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className={styles["feats-foot"]}>
            Nothing is ever deleted. If you stop paying, the PDF and every
            original recording stay yours.
          </div>
        </div>
      </div>
    </div>
  );
}
