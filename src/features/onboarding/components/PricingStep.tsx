"use client";

import { useState } from "react";

import { FEATURES } from "@/features/onboarding/data";
import {
  billingNote,
  intervalLabel,
  priceParts,
  usePlans,
  type Plan,
} from "@/features/billing";
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

/**
 * What it costs.
 *
 * The prices come from `GET /plans`, not from a constant in this repo. They
 * used to live in a `PLANS` array here while the database held a different
 * figure, and the two drifted by five dollars a month before anyone compared
 * them. The billing screen reads the same rows.
 */
export function PricingStep({ state, onChangeTerm, onNext }: PricingStepProps) {
  const [agreed, setAgreed] = useState(false);
  const { data: plans, isPending, error } = usePlans();

  const possessiveName = possessive(firstName(state.name));

  const selected: Plan | undefined =
    plans?.find((plan) => plan.billing_interval === state.term) ?? plans?.[0];

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

          {/*
            Nothing priced is rendered until the answer arrives. A placeholder
            number that corrects itself a moment later is worse than a blank
            space on the one screen where the figure has to be right.
          */}
          {selected ? (
            <>
              <div className={styles.seg}>
                {plans?.map((plan) => (
                  <button
                    key={plan.code}
                    type="button"
                    className={`${styles["seg-o"]} ${
                      selected.code === plan.code ? styles.sel : ""
                    }`}
                    onClick={() => onChangeTerm(plan.billing_interval)}
                  >
                    {intervalLabel(plan)}
                  </button>
                ))}
              </div>
              <div className={styles["big-price"]}>
                <span className={styles.cur}>
                  {priceParts(selected).symbol}
                </span>
                <span className={styles.amt}>
                  {priceParts(selected).amount}
                </span>
                <span className={styles.per}>{priceParts(selected).per}</span>
              </div>
              <div className={styles["price-note"]}>
                {billingNote(selected)}
              </div>
            </>
          ) : (
            <div className={styles["price-note"]}>
              {error
                ? "The price could not be loaded just now. Please try again in a moment."
                : " "}
            </div>
          )}

          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
            disabled={!agreed || !selected || isPending}
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
