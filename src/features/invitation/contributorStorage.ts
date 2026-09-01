"use client";

/**
 * Remembering a contributor who has no account.
 *
 * The product's hardest constraint, met with the smallest possible mechanism:
 * "contributors never create accounts". So when someone adds a memory, closes
 * the tab, and comes back next week, nothing about them is known — unless the
 * token the backend issued on their first contribution is still in this
 * browser. That is what this file keeps.
 *
 * Scoped per link, so a person who contributes to two different memoirs holds
 * two unrelated tokens and neither can be used on the other's memoir. The
 * backend checks the token together with the memoir id for the same reason.
 *
 * Written as a React external store — the same shape as `onboarding/
 * draftStorage.ts` — because `useSyncExternalStore` is how a component reads a
 * browser value without a hydration mismatch and without a setState-in-effect
 * cascade.
 */

const KEY_PREFIX = "memoir.contributor.";

const listeners = new Set<() => void>();

/**
 * The last value handed out, and the raw string it came from.
 *
 * `useSyncExternalStore` compares snapshots by identity and re-renders forever
 * if a fresh object comes back each call. Caching against the raw string means
 * the same stored value always yields the same object.
 */
let cachedRaw: string | null = null;
let cachedToken: string | null = null;

function storageKey(linkToken: string): string {
  return `${KEY_PREFIX}${linkToken}`;
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Reads the stored token, outside of React. */
export function readContributorToken(linkToken: string): string | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey(linkToken));
  } catch {
    // Private browsing, or storage disabled entirely. Not being remembered is
    // a much smaller loss than not being able to contribute, so this degrades
    // to "a new person every visit" rather than failing.
    return null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedToken = raw;
  }
  return cachedToken;
}

export function storeContributorToken(linkToken: string, token: string): void {
  try {
    window.localStorage.setItem(storageKey(linkToken), token);
  } catch {
    // Same reasoning: they simply will not be recognised next time.
  }
  emit();
}

export function subscribeToContributor(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Always null on the server — there is no localStorage there to read. */
export function getContributorServerSnapshot(): string | null {
  return null;
}
