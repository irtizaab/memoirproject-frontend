"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  readTheme,
  setTheme,
  subscribeToTheme,
  type Theme,
} from "@/lib/theme/store";

/**
 * The reader's palette choice, and a way to change it.
 *
 * Generic browser state rather than domain data, which is why it lives here
 * and not in a feature — the same reasoning as `useSupabaseSession`. It fetches
 * nothing.
 *
 * The effect exists to seed the store's cache from localStorage on mount. The
 * inline script in `app/layout.tsx` has already applied the theme to the
 * document by this point, so nothing visible changes here; this is only how
 * the menu learns which item to tick.
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  useEffect(() => {
    // Only notifies if the stored value differs from the default the snapshot
    // started on, so this does not re-render on every mount.
    if (readTheme() !== theme) setTheme(readTheme());
  }, [theme]);

  return { theme, setTheme };
}

export type { Theme };
