"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

/** What the session hook reports while it is still working it out. */
export type SessionState = {
  session: Session | null;
  /** True until the SDK has read localStorage and told us what it found. */
  isPending: boolean;
};

/**
 * Tracks the signed-in Supabase session, and keeps tracking it.
 *
 * A one-shot `getSession()` would be wrong in two ways: the SDK refreshes
 * tokens in the background, and signing out in a second tab should log this
 * one out too. `onAuthStateChange` covers both, and emits an `INITIAL_SESSION`
 * event on subscribe, which is what resolves `isPending`.
 *
 * Generic browser state rather than domain data, which is why it lives here
 * and not in a feature. It is deliberately not a data-fetching hook — it
 * reads a session the Supabase SDK already holds in localStorage, and calls
 * no API.
 */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    isPending: true,
  });

  useEffect(() => {
    // Note the callback is asynchronous — including for INITIAL_SESSION — so
    // this never sets state synchronously during the effect, which React's
    // compiler rules forbid.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isPending: false });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
