export type QuestionStep = "name" | "rel" | "years" | "deep";

/**
 * The steps after the account exists. Two, and both about money.
 *
 * There used to be five more — a dashboard, an "AI is drafting" spinner, a
 * chapter review, a publish confirmation, a published page. They were built
 * before the signed-in app existed and none of them did anything: the spinner
 * was a `setInterval`, the chapters were a hardcoded array, the published link
 * was invented. The flow now ends by handing the owner to `/archive`, which is
 * real. See commit f11ddbc if that design is ever wanted back.
 */
export type LateStep = "pricing" | "pay";

export type Step = "landing" | QuestionStep | "signup" | LateStep;

/**
 * The same vocabulary the backend's `plan.billing_interval` uses, so a chosen
 * term matches a plan row without a translation table in between.
 */
export type PlanTerm = "month" | "year";

export type OnboardingState = {
  name: string;
  rel: string | null;
  relLabel: string;
  deep: string;
  born: string;
  bornSet: boolean;
  through: string;
  throughSet: boolean;
  term: PlanTerm;
};

export const QUESTION_STEPS: QuestionStep[] = ["name", "rel", "years", "deep"];

export const LATE_STEPS: LateStep[] = ["pricing", "pay"];

export const STEP_ORDER: Step[] = [
  "landing",
  ...QUESTION_STEPS,
  "signup",
  ...LATE_STEPS,
];
