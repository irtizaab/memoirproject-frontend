"use client";

import { useRef } from "react";

import type { OnboardingState } from "@/features/onboarding/types";
import { firstName, possessive } from "@/features/onboarding/utils";

import styles from "../onboarding.module.css";
import { YearWheel } from "./YearWheel";

const ITEM_HEIGHT = 44;
const NOW = new Date().getFullYear();
const BORN_YEARS = Array.from({ length: NOW - 1900 + 1 }, (_, i) =>
  String(NOW - i),
);
const THROUGH_YEARS = [...BORN_YEARS, "Present"];

type YearsPatch = Pick<
  OnboardingState,
  "born" | "bornSet" | "through" | "throughSet"
>;

type YearsStepProps = {
  name: string;
  born: string;
  bornSet: boolean;
  through: string;
  throughSet: boolean;
  onCommit: (patch: YearsPatch) => void;
};

export function YearsStep({
  name,
  born,
  bornSet,
  through,
  throughSet,
  onCommit,
}: YearsStepProps) {
  const bornRef = useRef<HTMLDivElement>(null);
  const throughRef = useRef<HTMLDivElement>(null);

  const bornInitialIndex = bornSet
    ? Math.max(0, BORN_YEARS.indexOf(born))
    : BORN_YEARS.indexOf("1950");
  const throughInitialIndex = throughSet
    ? Math.max(
        0,
        THROUGH_YEARS.indexOf(through === "present" ? "Present" : through),
      )
    : 0;

  function commit() {
    /*
      An untouched "through" wheel commits the current year.

      The wheel already *shows* it — `throughInitialIndex` is 0, and
      THROUGH_YEARS starts at this year — so somebody who scrolls the Born wheel
      and presses on has, as far as they can tell, said "through 2026". Treating
      that as "no answer" recorded null and left the archive with no years line
      at all, which does not match what they were looking at.

      What it means downstream: `subject_is_living: false` with
      `through_year: NOW`, because Postgres rejects a living subject with an end
      year (`draft_living_has_no_end_year`). Somebody recording a living person
      picks "Present" on the wheel, which is what that option is for.
    */
    const patch: YearsPatch = {
      born: "",
      bornSet: false,
      through: String(NOW),
      throughSet: true,
    };

    const bornEl = bornRef.current;
    if (bornEl) {
      const bi = Math.round(bornEl.scrollTop / ITEM_HEIGHT);
      const value = BORN_YEARS[bi];
      if (value) {
        patch.born = value;
        patch.bornSet = true;
      }
    }

    // Read the wheel wherever it is sitting, touched or not — its resting
    // position is the current year, which is exactly the default we want.
    const throughEl = throughRef.current;
    if (throughEl) {
      const ti = Math.round(throughEl.scrollTop / ITEM_HEIGHT);
      const value = THROUGH_YEARS[ti];
      if (value) patch.through = value === "Present" ? "present" : value;
    }

    onCommit(patch);
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.ask}>
        What years should we show with {possessive(firstName(name))} story?
      </h2>
      <p className={styles["ask-sub"]}>
        Scroll to a year. You can make these exact later.
      </p>
      <div className={styles.wheels}>
        <YearWheel
          id="w-born"
          label="Born"
          values={BORN_YEARS}
          initialIndex={bornInitialIndex}
          wheelRef={bornRef}
        />
        <YearWheel
          id="w-through"
          label="Through"
          values={THROUGH_YEARS}
          initialIndex={throughInitialIndex}
          wheelRef={throughRef}
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          onClick={commit}
        >
          One last question
        </button>
      </div>
    </div>
  );
}
