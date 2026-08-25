"use client";

import { useState } from "react";

import styles from "../onboarding.module.css";

type ConfirmStepProps = {
  onBack: () => void;
  onPublish: () => void;
};

export function ConfirmStep({ onBack, onPublish }: ConfirmStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);

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
      <h2 className={styles.ask}>Publishing is permanent.</h2>
      <div className={styles.warn}>
        <b>Once published, this memoir cannot be edited.</b>
        No new memories can be added and nothing can be changed — not by you,
        not by anyone. If more comes to light later, it becomes a second
        memoir.
        <br />
        <br />
        The comment layer stays open. Your family can keep talking about it,
        and adding to that conversation, for as long as they want.
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        I understand this cannot be undone.
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-text"]}`}
          onClick={onBack}
        >
          Not yet
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          disabled={!acknowledged}
          onClick={onPublish}
        >
          Publish permanently
        </button>
      </div>
    </div>
  );
}
