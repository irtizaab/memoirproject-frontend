import type { PlanTerm } from "@/features/onboarding/types";

/** [chip label, relation value] */
export const RELATIONS: [string, string][] = [
  ["My parent", "child"],
  ["My grandparent", "grandchild"],
  ["My partner", "spouse_partner"],
  ["My friend", "friend"],
];

/** [name, relation, contribution, hasJoined] */
export const PEOPLE: [string, string, string, boolean][] = [
  ["Yusuf Khan", "Brother", "6 memories", true],
  ["Amina Sethi", "Daughter", "4 memories", true],
  ["Rukhsana Bibi", "Sister", "3 memories", true],
  ["Nadia Khan", "Granddaughter", "10 memories", true],
  ["Tariq Mahmood", "Friend", "Opened, nothing yet", false],
];

/** [title, meta, flag] */
export const CHAPTERS: [string, string, string][] = [
  ["The bakery on Kissa Khwani", "5 memories · 4 photographs", ""],
  [
    "Coming to Peshawar, 1961",
    "3 memories · dated from two accounts",
    "",
  ],
  ["The house on Jamrud Road", "4 memories · 11 photographs", ""],
  [
    "Sundays",
    "3 memories",
    "Two accounts of the same afternoon differ — both kept.",
  ],
  ["The years at the mill", "5 memories · 9 photographs", ""],
  ["What people said about him", "3 memories · 7 photographs", ""],
];

export const WORK_MESSAGES = [
  "Reading 23 memories…",
  "Finding what can be dated…",
  "Matching photographs to the stories that mention them…",
  "Drafting chapters…",
  "Almost there…",
];

/** [title, description] */
export const FEATURES: [string, string][] = [
  [
    "One invitation link",
    "For everyone who knew them — family, friends, colleagues, neighbours",
  ],
  [
    "Voice, text and photographs",
    "Contributed from any phone. Nobody makes an account.",
  ],
  [
    "A question library",
    "Written prompts for each person, so nobody faces a blank page",
  ],
  [
    "AI chapters and a timeline",
    "Proposed by the system, approved or rewritten by you",
  ],
  [
    "A private memoir page",
    "Unlisted and searchable, with a comment layer that never expires",
  ],
  ["PDF export", "Downloadable and yours permanently"],
];

/** [term, label, price, per, note] */
export const PLANS: [PlanTerm, string, string, string, string][] = [
  ["monthly", "Monthly", "3", "/month", "Billed monthly. Cancel any time."],
  ["yearly", "Yearly", "30", "/year", "Billed once a year — two months free."],
];

/**
 * Background photo per step. `signup` has no matching asset in
 * `public/Images/` — the layer stays hidden for that step, same as the
 * original prototype's fallback when a key has no url.
 */
export const STEP_BACKGROUND: Partial<Record<string, string>> = {
  landing: "/Images/78f0c21f-812b-4a25-b417-fee3736e659f.jpg",
  name: "/Images/a19272d2-03a9-4fa4-8f41-f0e3f9e869ed.jpg",
  rel: "/Images/ca328bf4-b1f7-49c4-9927-89b9fb46bab8.jpg",
  years: "/Images/205674c2-e834-4106-a2a3-8a1da8d6aa01.jpg",
  deep: "/Images/5ae76f99-aa82-4ca9-9ac8-3feeb88213e7.jpg",
  pricing: "/Images/039d2eb7-a749-4c26-9478-b63e90736b87.jpg",
};

/** Per-step background opacity. The pricing photo is high-contrast noise, so it sits much lower. */
export const STEP_BACKGROUND_OPACITY: Partial<Record<string, number>> = {
  landing: 0.24,
  name: 0.22,
  rel: 0.24,
  years: 0.26,
  deep: 0.22,
  signup: 0.22,
  pricing: 0.1,
};
