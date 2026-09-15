import type { Metadata } from "next";

import { Wordmark } from "@/components/layout/Wordmark";
import { SignInForm } from "@/features/account";

/**
 * The way back in.
 *
 * Outside the `(app)` group — there is no session to guard yet, and the
 * signed-in header would be four dead ends to somebody who is not signed in.
 * One column, because a sign-in is two fields and a button, and this is the
 * one screen in the product that should be over in four seconds.
 */
export const metadata: Metadata = { title: "Sign in · The Memoir Project" };

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-4">
          <Wordmark href="/" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[26rem] rounded-2xl border border-border/70 bg-card px-7 py-9 shadow-lift">
          <p className="eyebrow-muted">Welcome back</p>
          <h1 className="mt-3 font-heading text-2xl leading-tight font-normal tracking-tight">
            Sign in to your memoir
          </h1>
          <p className="mt-2.5 font-sans text-sm leading-relaxed text-muted-foreground">
            The same email and password you made it with.
          </p>

          <SignInForm />
        </div>
      </main>
    </div>
  );
}
