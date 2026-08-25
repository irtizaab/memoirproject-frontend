"use client";

import { PEOPLE } from "@/features/onboarding/data";
import type { OnboardingState } from "@/features/onboarding/types";
import { firstName, possessive } from "@/features/onboarding/utils";
import { useTransientLabel } from "@/features/onboarding/useTransientLabel";

import styles from "../onboarding.module.css";

const INVITE_LINK = "memoirproject.co/j/k4m9-tqzr-81ha";

type DashboardStepProps = {
  state: OnboardingState;
  onCollect: () => void;
  onOrganize: () => void;
};

export function DashboardStep({
  state,
  onCollect,
  onOrganize,
}: DashboardStepProps) {
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy link");
  const [shareLabel, showShareLabel] = useTransientLabel("Share on WhatsApp");
  const [reminderLabel, showReminderLabel] = useTransientLabel(
    "Send a reminder",
  );

  function copyLink() {
    const done = () => showCopyLabel("Copied", 1800);
    if (navigator.clipboard) navigator.clipboard.writeText(INVITE_LINK).then(done, done);
    else done();
  }

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["dash-head"]}>
        <div className={styles.eyebrow}>
          {state.collected
            ? `${possessive(firstName(state.name))} memoir`
            : "Memoir saved"}
        </div>
        <h2>
          {state.collected
            ? "Four people have added memories."
            : "Now bring in the family."}
        </h2>
        <p>
          {state.collected
            ? "Nine were invited. You can send one reminder to the five who haven't opened it yet."
            : "One link, for everyone."}
        </p>
      </div>

      {state.collected && (
        <div className={styles.people}>
          {PEOPLE.map(([personName, relation, contribution, joined]) => (
            <div
              key={personName}
              className={`${styles.person} ${joined ? "" : styles.pending}`}
            >
              <span className={styles["person-n"]}>{personName}</span>
              <span className={styles["person-r"]}>{relation}</span>
              <span className={styles["person-c"]}>{contribution}</span>
            </div>
          ))}
          <div className={styles["person-more"]}>
            4 others invited, not opened
          </div>
        </div>
      )}

      {state.collected && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>23</div>
            <div className={styles["stat-l"]}>Memories</div>
          </div>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>31</div>
            <div className={styles["stat-l"]}>Photographs</div>
          </div>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>2h 14m</div>
            <div className={styles["stat-l"]}>Recorded</div>
          </div>
        </div>
      )}

      <div>
        <div className={styles.linklabel}>The link to share</div>
        <div className={styles.linkbox}>
          <code>{INVITE_LINK}</code>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={copyLink}
          >
            {copyLabel}
          </button>
        </div>
        <div className={styles["share-row"]}>
          <button
            type="button"
            className={styles["btn-quiet"]}
            onClick={() => showShareLabel("Opens the share sheet", 1600)}
          >
            {shareLabel}
          </button>
        </div>
      </div>

      {state.collected && (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-text"]}`}
            onClick={() => showReminderLabel("Opens the share sheet", 1600)}
          >
            {reminderLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={onOrganize}
          >
            Organize into chapters
          </button>
        </div>
      )}

      <div className={styles["dash-foot"]}>
        Private and unpublished. Nothing is locked until you publish it
        yourself.
      </div>
      {!state.collected && (
        <button type="button" className={styles.jump} onClick={onCollect}>
          Prototype · skip ahead four days →
        </button>
      )}
    </div>
  );
}
