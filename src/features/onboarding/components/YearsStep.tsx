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
  const throughSetRef = useRef(throughSet);

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
    const patch: YearsPatch = {
      born: "",
      bornSet: false,
      through: String(NOW),
      throughSet: throughSetRef.current,
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

    const throughEl = throughRef.current;
    if (throughSetRef.current && throughEl) {
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
          onPick={() => {
            throughSetRef.current = true;
          }}
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
