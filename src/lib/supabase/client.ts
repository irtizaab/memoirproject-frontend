"use client";

/**
 * The Supabase Auth client — infrastructure, the twin of the backend's
 * `src/integrations/supabase_auth.py`.
 *
 * The split between the two is worth understanding, because it is the whole
 * security model:
 *
 *   this file      signs users up and in, holds the session, refreshes tokens
 *   the backend    only ever *verifies* a token, against Supabase's public key
 *
 * The backend never sees a password and holds nothing that could mint a token.
 * That is why the anon key below is safe in the browser bundle: it identifies
 * the project, it does not grant access to anything.
 *
 * `lib/api/client.ts` remains the only module that calls `fetch` for OUR
 * backend. This one does not call the backend at all — it talks to Supabase
 * through their SDK, which is exactly the "wrapper around an external service"
 * role `src/lib/` exists for.
 */

import { createClient, type Session } from "@supabase/supabase-js";

import { env } from "@/lib/config/env";

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      // Keep the session in localStorage and refresh it in the background, so
      // a reload mid-onboarding does not silently log the user out.
      persistSession: true,
      autoRefreshToken: true,
      // Read the token out of the URL fragment after an OAuth redirect. This
      // is what makes "Continue with Google" land back on the page signed in.
      detectSessionInUrl: true,
    },
  },
);

/**
 * The current access token, or null when nobody is signed in.
 *
 * `getSession()` rather than a cached variable: the SDK refreshes tokens in
 * the background, and a token captured once at sign-in would go stale and
 * start coming back as 401s from the backend an hour later.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Authorization header for a backend call, or `{}` when signed out.
 *
 * Returning an empty object rather than throwing lets a caller build headers
 * unconditionally; the backend answers 401 if the route needed auth, which is
 * the same answer it would give to an expired token.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Creates the account and signs in. Used by the signup step. */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // With "Confirm email" switched on in Supabase, signUp succeeds but returns
  // no session — the user has to click a link first. Say so plainly instead of
  // letting the next step fail with an unexplained 401.
  if (!data.session) {
    throw new Error(
      "Check your email to confirm your address, then sign in.",
    );
  }
  return data.session;
}

/** Signs in an existing account. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

/**
 * Starts the Google redirect flow.
 *
 * This navigates away from the page, so nothing after it runs. The draft id
 * and token are already in localStorage by this point, which is what lets the
 * flow pick up where it left off when Google sends the user back.
 *
 * Requires the Google provider to be enabled in the Supabase dashboard; until
 * it is, Supabase answers with "provider is not enabled" and the signup step
 * shows that message rather than pretending it worked.
 */
export async function signInWithGoogle(redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
