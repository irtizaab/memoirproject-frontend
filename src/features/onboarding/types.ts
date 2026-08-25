export type QuestionStep = "name" | "rel" | "years" | "deep";

export type LateStep =
  | "pricing"
  | "pay"
  | "dash"
  | "working"
  | "review"
  | "confirm"
  | "published";

export type Step = "landing" | QuestionStep | "signup" | LateStep;

export type PlanTerm = "monthly" | "yearly";

export type OnboardingState = {
  name: string;
  rel: string | null;
  relLabel: string;
  deep: string;
  born: string;
  bornSet: boolean;
  through: string;
  throughSet: boolean;
  collected: boolean;
  term: PlanTerm;
};

export const QUESTION_STEPS: QuestionStep[] = ["name", "rel", "years", "deep"];

export const LATE_STEPS: LateStep[] = [
  "pricing",
  "pay",
  "dash",
  "working",
  "review",
  "confirm",
  "published",
];

export const STEP_ORDER: Step[] = [
  "landing",
  ...QUESTION_STEPS,
  "signup",
  ...LATE_STEPS,
];
