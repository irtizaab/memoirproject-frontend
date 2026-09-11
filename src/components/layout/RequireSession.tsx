"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSupabaseSession } from "@/hooks/useSupabaseSession";

/**
 * Keeps the signed-in app signed-in-only.
 *
 * This is a **convenience, not a security boundary.** The session lives in the
 * browser, so anything decided here can be bypassed by anyone willing to open
 * devtools. What actually protects a memoir is the backend: every route under
 * `/memoirs` and `/me` verifies a Supabase JWT, and answers 404 — never 403 —
 * for a memoir that is not yours. This component exists so a signed-out
 * visitor sees the sign-in page instead of a screenful of failed requests.
 *
 * It sends them to `/signin` rather than `/onboarding`: somebody who typed or
 * bookmarked `/archive` has an account, and the flow that starts "before we
 * begin, one promise" is the wrong answer to an expired session. `/signin`
 * links onward to onboarding for the genuinely new.
 *
 * Children still render on the server; they are passed through as a prop.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isPending } = useSupabaseSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/signin");
  }, [isPending, session, router]);

  // Nothing rendered until the answer is known. Showing the app and then
  // yanking it away is worse than a blank moment, and the session is read from
  // localStorage, so this is measured in milliseconds rather than a round trip.
  if (isPending || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="font-sans text-sm text-ink-faint">One moment…</p>
      </div>
    );
  }

  return <>{children}</>;
}
