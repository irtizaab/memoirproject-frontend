"use client";

import { firstName, possessive } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";

type NameStepProps = {
  name: string;
  onChange: (name: string) => void;
  onNext: () => void;
};

export function NameStep({ name, onChange, onNext }: NameStepProps) {
  const canContinue = name.trim().length >= 2;

  return (
    <div className={styles.step}>
      <h2 className={styles.ask}>Who is this memoir for?</h2>
      <div className={styles.field}>
        <label htmlFor="f-name">Their full name</label>
        <input
          id="f-name"
          className={styles["rule-input"]}
          autoComplete="off"
          placeholder="Ahmed Khan"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canContinue) onNext();
          }}
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]} ${styles["reveal-btn"]} ${canContinue ? styles.on : ""}`}
          onClick={() => canContinue && onNext()}
        >
          {canContinue ? `${possessive(firstName(name))} memoir  →` : "Go on"}
        </button>
      </div>
    </div>
  );
}
