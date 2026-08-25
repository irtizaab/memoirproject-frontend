"use client";

import type { OnboardingState } from "@/features/onboarding/types";
import { useTransientLabel } from "@/features/onboarding/useTransientLabel";
import { slugifyName } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";
import { BookCover } from "./BookCover";

export function PublishedStep({ state }: { state: OnboardingState }) {
  const link = `memoirproject.co/m/${slugifyName(state.name)}-9f2c`;
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy link");
  const [pdfLabel, showPdfLabel] = useTransientLabel("Download the PDF");
  const [tellLabel, showTellLabel] = useTransientLabel(
    "Tell the contributors",
  );

  function copyLink() {
    const done = () => showCopyLabel("Copied", 1800);
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, done);
    else done();
  }

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["cover-wrap"]}>
        <BookCover
          name={state.name}
          born={state.born}
          bornSet={state.bornSet}
          through={state.through}
        />
      </div>
      <p className={styles["ask-sub"]}>
        Published. Six chapters, twenty-three memories, four voices.
      </p>
      <div style={{ marginTop: 32 }}>
        <div className={styles.linklabel}>The memoir</div>
        <div className={styles.linkbox}>
          <code>{link}</code>
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
            onClick={() => showPdfLabel("Opens the share sheet", 1600)}
          >
            {pdfLabel}
          </button>
          <button
            type="button"
            className={styles["btn-quiet"]}
            onClick={() => showTellLabel("Opens the share sheet", 1600)}
          >
            {tellLabel}
          </button>
        </div>
      </div>
      <div className={styles["dash-foot"]}>
        Only invited family can open this. Comments are on.
      </div>
    </div>
  );
}
