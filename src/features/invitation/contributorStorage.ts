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
 * ---------------------------------------------------------------------------
 * Scoped to the memoir, not to the link
 * ---------------------------------------------------------------------------
 * This used to key on the share link's token, which was wrong in a way that
 * only showed up months later: **reissuing the link erased everybody.** The
 * URL token changes, so the storage key changes, so every contributor who had
 * ever been recognised became a new person on their next visit — on the very
 * same device that already knew them, with their earlier memories stranded
 * under a name that now had nobody behind it.
 *
 * Keyed on the memoir instead, revoking a link does what it says: it stops new
 * people getting in. It does not forget the people already inside.
 *
 * The token is still checked against the memoir server-side, so someone who
 * contributes to two memoirs holds two unrelated tokens and neither works on
 * the other's.
 *
 * Written as a React external store — the same shape as `onboarding/
 * draftStorage.ts` — because `useSyncExternalStore` is how a component reads a
 * browser value without a hydration mismatch and without a setState-in-effect
 * cascade.
 */

const KEY_PREFIX = "memoir.contributor.";

/**
 * The key this file used before the change above. Read once per visit and then
 * left alone; see `migrateContributorToken`.
 */
const LEGACY_KEY_PREFIX = "memoir.contributor.link.";

const listeners = new Set<() => void>();

function storageKey(memoirId: string): string {
  return `${KEY_PREFIX}${memoirId}`;
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Reads without throwing. Returns null when storage is unavailable. */
function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing, or storage disabled entirely. Not being remembered is
    // a much smaller loss than not being able to contribute, so this degrades
    // to "a new person every visit" rather than failing.
    return null;
  }
}

/**
 * Reads the stored token, outside of React.
 *
 * Pure, and it must stay pure: this is the `getSnapshot` behind
 * `useSyncExternalStore`, which calls it during render and compares results by
 * identity. A string compares by value, so repeated calls are stable with no
 * caching needed. Anything that *writes* belongs in `migrateContributorToken`.
 */
export function readContributorToken(memoirId: string): string | null {
  return read(storageKey(memoirId));
}

export function storeContributorToken(memoirId: string, token: string): void {
  try {
    window.localStorage.setItem(storageKey(memoirId), token);
  } catch {
    // Same reasoning: they simply will not be recognised next time.
  }
  emit();
}

/**
 * Carries a token stored under the old link-scoped key across to the new one.
 *
 * Without this, the fix described at the top of the file would itself orphan
 * every contributor exactly once — which is the bug, arriving by a different
 * route. Runs from an effect rather than from the read above, because it
 * writes.
 *
 * Idempotent and cheap: once the new key exists this returns on its first
 * line, which is the case for everybody after their first visit.
 */
export function migrateContributorToken(
  memoirId: string,
  linkToken: string,
): void {
  if (readContributorToken(memoirId)) return;

  // Both spellings of the old key. The prefixed one never shipped, but reading
  // it costs nothing and the bare `memoir.contributor.<linkToken>` is what is
  // actually in people's browsers today.
  const legacy =
    read(`${KEY_PREFIX}${linkToken}`) ??
    read(`${LEGACY_KEY_PREFIX}${linkToken}`);

  if (legacy) storeContributorToken(memoirId, legacy);
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
