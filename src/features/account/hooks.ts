"use client";

/**
 * The client data path for the account.
 *
 * There is no `queries.ts`: `GET /me` is authenticated with a Supabase token
 * that lives in the browser's localStorage, so it cannot be fetched during
 * server rendering.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/features/account/api";
import type { MemoirSummary } from "@/features/account/schemas";
import { getAccessToken } from "@/lib/supabase/client";

/**
 * Cache keys as a factory rather than scattered string arrays. Hand-writing
 * `["account", "me"]` at each call site is how invalidation quietly breaks.
 */
export const accountKeys = {
  all: ["account"] as const,
  me: () => [...accountKeys.all, "me"] as const,
};

/**
 * The signed-in user and their memoirs.
 *
 * `enabled` is gated on there actually being a session, so this does not fire
 * a guaranteed 401 for every anonymous visitor. The token check runs in its
 * own effect because reading the session is async.
 */
export function useMe() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAccessToken().then((token) => {
      if (!cancelled) setHasSession(Boolean(token));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useQuery({
    queryKey: accountKeys.me(),
    queryFn: () => getMe(),
    enabled: hasSession,
  });
}

/**
 * The memoir every signed-in screen is about.
 *
 * The backend returns memoirs newest first, and the product supports exactly
 * one per account today — so "the first one" is the whole selection rule. When
 * a second memoir becomes possible this is the single place a switcher hooks
 * into, rather than four pages each picking `memoirs[0]` for themselves.
 */
export function useActiveMemoir(): {
  memoir: MemoirSummary | null;
  isPending: boolean;
  error: Error | null;
} {
  const { data, isPending, error } = useMe();

  return {
    memoir: data?.memoirs[0] ?? null,
    isPending,
    error: error as Error | null,
  };
}
