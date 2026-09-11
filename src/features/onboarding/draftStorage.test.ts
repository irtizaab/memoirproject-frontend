import { beforeEach, describe, expect, it } from "vitest";

import { storeAnswers, takeAnswers } from "@/features/onboarding/draftStorage";
import type { OnboardingState } from "@/features/onboarding/types";

const ANSWERS: OnboardingState = {
  name: "Eleanor Marsh",
  rel: "grandchild",
  relLabel: "",
  deep: "The way she hummed while cooking.",
  born: "1931",
  bornSet: true,
  through: "present",
  throughSet: true,
  term: "month",
};

/**
 * The Google handoff. `storeAnswers` runs the instant before the browser
 * leaves for Google; `takeAnswers` is what the returning page load has instead
 * of the React state that died with it.
 *
 * The one-shot part is the load-bearing half: its presence is what tells
 * `OnboardingFlow` this page load is a return from Google and a claim is owed.
 * A read that left the value behind would re-claim on every later visit.
 */
describe("the Google handoff", () => {
  beforeEach(() => window.localStorage.clear());

  it("gives the answers back once, then forgets them", () => {
    storeAnswers(ANSWERS);

    expect(takeAnswers()).toEqual(ANSWERS);
    expect(takeAnswers()).toBeNull();
  });

  it("reads nothing when nothing was parked", () => {
    expect(takeAnswers()).toBeNull();
  });

  it("treats a corrupted value as no answers rather than throwing", () => {
    window.localStorage.setItem("memoir.onboarding.answers", "{not json");
    expect(takeAnswers()).toBeNull();

    window.localStorage.setItem(
      "memoir.onboarding.answers",
      JSON.stringify({ ...ANSWERS, bornSet: "yes" }),
    );
    expect(takeAnswers()).toBeNull();
  });
});
