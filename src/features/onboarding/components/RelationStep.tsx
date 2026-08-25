"use client";

import { RELATIONS } from "@/features/onboarding/data";
import type { OnboardingState } from "@/features/onboarding/types";
import { firstName } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";

type RelationStepProps = {
  name: string;
  rel: OnboardingState["rel"];
  relLabel: string;
  onChange: (patch: Pick<OnboardingState, "rel" | "relLabel">) => void;
  onNext: () => void;
};

export function RelationStep({
  name,
  rel,
  relLabel,
  onChange,
  onNext,
}: RelationStepProps) {
  const canContinue = Boolean(rel && (rel !== "other" || relLabel));

  return (
    <div className={styles.step}>
      <h2 className={styles.ask}>{firstName(name)} is your…</h2>
      <p className={styles["ask-sub"]}>
        This decides which questions your family is asked. A grandchild is
        asked different things than an old colleague.
      </p>
      <div className={styles.chips}>
        {RELATIONS.map(([label, value]) => (
          <button
            key={value}
            type="button"
            className={`${styles.chip} ${rel === value ? styles.sel : ""}`}
            onClick={() => onChange({ rel: value, relLabel: "" })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles["or-line"]}>or</div>
      <div className={styles.field} style={{ marginTop: 18 }}>
        <label htmlFor="f-relother">In your own words</label>
        <input
          id="f-relother"
          className={styles["rule-input"]}
          placeholder="The woman who raised me"
          value={rel === "other" ? relLabel : ""}
          onChange={(e) =>
            onChange({ rel: "other", relLabel: e.target.value.trim() })
          }
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          disabled={!canContinue}
          onClick={onNext}
        >
          Now the years
        </button>
      </div>
    </div>
  );
}
