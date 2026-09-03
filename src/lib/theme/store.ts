"use client";

/**
 * Which palette the reader has asked for.
 *
 * Infrastructure rather than a feature: it is a browser value with no domain
 * knowledge, so it belongs beside the API client and the validated env rather
 * than in `features/`.
 *
 * Written as a React external store — the same shape as `features/invitation/
 * contributorStorage.ts` and `features/onboarding/draftStorage.ts` — because
 * `useSyncExternalStore` is how a component reads a browser value without a
 * hydration mismatch.
 *
 * ---------------------------------------------------------------------------
 * Three states, not two
 * ---------------------------------------------------------------------------
 * "system" is the default and is not the same as "light". It means: follow the
 * operating system, and keep following it when it changes at sunset. It is
 * stored as the *absence* of the `data-theme` attribute, which is what lets the
 * `@media (prefers-color-scheme: dark)` block in `globals.css` answer for it.
 *
 * ---------------------------------------------------------------------------
 * Why the attribute is also set by a script in `app/layout.tsx`
 * ---------------------------------------------------------------------------
 * React runs after the first paint. If this file were the only thing applying
 * the theme, someone who chose dark would get one frame of full-page ivory on
 * every single navigation — the flash that makes a theme toggle feel broken.
 * The inline script in the document head applies it before anything is drawn;
 * this store is what changes it afterwards. They read and write the same key,
 * and the key is written down in both places because a script in the head
 * cannot import.
 */

export type Theme = "light" | "dark" | "system";

/** Also hardcoded in the inline script in `app/layout.tsx`. Keep them equal. */
export const THEME_STORAGE_KEY = "memoir.theme";

const listeners = new Set<() => void>();

let cached: Theme = "system";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Reads the stored preference, outside of React. */
export function readTheme(): Theme {
  if (typeof window === "undefined") return "system";

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private browsing, or storage disabled. Following the operating system is
    // a perfectly good answer, so this degrades to "system" rather than
    // failing.
    return "system";
  }

  cached = isTheme(raw) ? raw : "system";
  return cached;
}

/**
 * Puts the choice on the document, where the CSS can see it.
 *
 * "system" removes the attribute rather than setting a value, because the
 * media query in `globals.css` is guarded on the attribute being absent — that
 * guard is what makes an explicit light choice beat a dark operating system.
 */
function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme: Theme): void {
  cached = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // They simply will not be remembered next visit. The page still changes.
  }

  apply(theme);
  listeners.forEach((listener) => listener());
}

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Reads the cache rather than storage, so repeated calls are identical. */
export function getThemeSnapshot(): Theme {
  return cached;
}

/**
 * Always "system" on the server — there is no localStorage to read there, and
 * no operating system either.
 */
export function getThemeServerSnapshot(): Theme {
  return "system";
}
