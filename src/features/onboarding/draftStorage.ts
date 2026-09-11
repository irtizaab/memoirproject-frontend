"use client";

/**
 * Where the anonymous draft's credentials live between page loads.
 *
 * Before signup there is no account and no session, so the draft id and its
 * secret token are the entire proof that this browser owns these answers. Lose
 * them and the answers are unreachable — not deleted, just orphaned until the
 * row expires 30 days later.
 *
 * localStorage rather than a cookie, deliberately: the frontend and the API
 * are on different origins, so a cookie would have to be a cross-site one, and
 * that is a fight with browser defaults nobody needs. The token travels as an
 * explicit `X-Draft-Token` header instead.
 */

import {
  draftCreatedSchema,
  onboardingStateSchema,
  type DraftCreated,
} from "@/features/onboarding/schemas";
import type { OnboardingState } from "@/features/onboarding/types";

const STORAGE_KEY = "memoir.draft";

/**
 * localStorage exposed as a React external store.
 *
 * React needs three things to read a value that lives outside its own state:
 * a way to subscribe to changes, a snapshot getter, and a *server* snapshot
 * for the render that happens before the browser exists. That is exactly what
 * `useSyncExternalStore` takes, and it is why this file grew a listener set
 * rather than the component reading localStorage in an effect.
 *
 * Subscribing to the `storage` event comes free with this shape: a draft
 * claimed in one tab clears in the other rather than going stale.
 */
const listeners = new Set<() => void>();

/**
 * Snapshots must be referentially stable.
 *
 * `getSnapshot` is called on every render, and React re-renders whenever the
 * value differs by identity. Parsing the JSON fresh each time would return a
 * new object every call and spin forever, so the parsed value is cached and
 * only recomputed when the underlying string actually changes.
 */
let cachedRaw: string | null = null;
let cachedDraft: DraftCreated | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToDraft(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Client snapshot for `useSyncExternalStore`. */
export function getDraftSnapshot(): DraftCreated | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = raw ? parseDraft(raw) : null;
  }
  return cachedDraft;
}

/**
 * Server snapshot. Always null: there is no localStorage while rendering on
 * the server, and claiming otherwise would cause a hydration mismatch.
 */
export function getDraftServerSnapshot(): DraftCreated | null {
  return null;
}

function parseDraft(raw: string): DraftCreated | null {
  try {
    const parsed = draftCreatedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the stored draft, or null if there isn't a valid one.
 *
 * Never call during render — localStorage does not exist on the server, so a
 * value read during render would differ between the server-rendered HTML and
 * the first client render, and React would throw a hydration error. Read it in
 * an effect instead.
 *
 * Parsed through the same Zod schema as the API response: whatever is in
 * localStorage is untrusted input, and a half-written or hand-edited value
 * should read as "no draft", not crash the flow.
 */
export function readStoredDraft(): DraftCreated | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = draftCreatedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Private browsing and storage-disabled modes throw on access rather than
    // returning null. Onboarding still works, it just cannot resume.
    return null;
  }
}

export function storeDraft(draft: DraftCreated): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Not fatal: the flow continues in memory for this page load.
  }
  // `storage` only fires in *other* tabs, so this tab has to be told directly.
  emit();
}

/**
 * Forgets the draft. Called once it has been claimed into a real memoir.
 *
 * Leaving it behind would mean the next visit tries to resume a draft the
 * backend has already marked claimed, and every save would come back 404.
 */
export function clearStoredDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignored for the same reason as above.
  }
  emit();
}

/* ---------------------------------------------------------------------------
   The Google handoff
   ---------------------------------------------------------------------------

   "Continue with Google" leaves the site. The browser comes back to a fresh
   page load, which means `OnboardingFlow` remounts at step `landing` with
   every answer gone — they only ever lived in React state.

   So the answers are parked here on the way out and picked up on the way back.
   Written *only* immediately before the redirect, which makes their presence
   the signal that this page load is a return from Google rather than somebody
   visiting /onboarding with an old draft lying around.

   Not merged into the draft entry above: that one is the credential and
   survives until the draft is claimed, this one is a single hop and is cleared
   the moment it has been read.
*/

const ANSWERS_KEY = "memoir.onboarding.answers";

export function storeAnswers(state: OnboardingState): void {
  try {
    window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled. The redirect still works; the answers are re-asked.
  }
}

/** Reads and immediately forgets the parked answers. */
export function takeAnswers(): OnboardingState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ANSWERS_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(ANSWERS_KEY);

    const parsed = onboardingStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
