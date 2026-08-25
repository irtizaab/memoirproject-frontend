import { QUESTION_STEPS, type QuestionStep } from "@/features/onboarding/types";

import styles from "../onboarding.module.css";

export function Stepper({ current }: { current: QuestionStep }) {
  const index = QUESTION_STEPS.indexOf(current);

  return (
    <div className={styles.stepper}>
      {QUESTION_STEPS.map((step, i) => (
        <div
          key={step}
          className={`${styles.seg} ${i < index ? styles.done : i === index ? styles.now : ""}`}
        />
      ))}
    </div>
  );
}
