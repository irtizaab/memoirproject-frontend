"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInFormSchema,
  type SignInFormValues,
} from "@/features/account/schemas";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { signInWithGoogle, signInWithPassword } from "@/lib/supabase/client";

/**
 * Signing back in.
 *
 * The gap this fills: onboarding creates an account as a side effect of making
 * a memoir, and there was no other door. Coming back meant running the whole
 * flow again — the pledge, the name, the years, the pricing — to be told at the
 * end that you already have a memoir, because `memoir_one_per_account` refuses
 * the second claim with a 409.
 *
 * Nothing here calls this product's API. Supabase Auth issues the token and
 * `lib/api/client.ts` attaches it to everything afterwards; the backend only
 * ever verifies one. That is the whole security model and it is why this
 * component is twenty lines of form and no `apiRequest`.
 *
 * Where it sends you: `/archive`. An account with no memoir is bounced on to
 * onboarding by the `(app)` layout, which is the right place for it, so this
 * does not need to know whether one exists.
 */
export function SignInForm() {
  const router = useRouter();
  const { session, isPending } = useSupabaseSession();
  const [failed, setFailed] = useState<string | null>(null);

  // Somebody already signed in has no business on this page — a form asking
  // for a password you have already given reads as "you have been logged out".
  useEffect(() => {
    if (!isPending && session) router.replace("/archive");
  }, [isPending, session, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (values: SignInFormValues) => {
    setFailed(null);
    try {
      await signInWithPassword(values.email, values.password);
      router.replace("/archive");
    } catch (error) {
      // Supabase says "Invalid login credentials" for both a wrong password
      // and an email that was never registered, and that is the right answer
      // to give back: distinguishing them tells a stranger which emails have
      // accounts here.
      setFailed(
        error instanceof Error ? error.message : "Could not sign you in.",
      );
    }
  };

  const google = async () => {
    setFailed(null);
    try {
      await signInWithGoogle(`${window.location.origin}/archive`);
    } catch (error) {
      setFailed(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="mt-8" noValidate>
      <label className="block">
        <span className="eyebrow-muted">Email</span>
        <Input
          {...register("email")}
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={Boolean(errors.email)}
          className="mt-1.5"
        />
        {errors.email && (
          <span className="mt-1.5 block font-sans text-xs text-seal">
            {errors.email.message}
          </span>
        )}
      </label>

      <label className="mt-5 block">
        <span className="eyebrow-muted">Password</span>
        <Input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          className="mt-1.5"
        />
        {errors.password && (
          <span className="mt-1.5 block font-sans text-xs text-seal">
            {errors.password.message}
          </span>
        )}
      </label>

      <Button type="submit" disabled={isSubmitting} className="mt-7 w-full">
        {isSubmitting && (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        )}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <button
        type="button"
        onClick={google}
        className="mt-3 w-full rounded-full border border-border bg-card px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:border-ink-faint hover:text-foreground"
      >
        Continue with Google
      </button>

      {failed && (
        <p role="alert" className="mt-4 font-sans text-sm text-seal">
          {failed}
        </p>
      )}

      <p className="mt-8 border-t border-border pt-5 font-sans text-sm text-muted-foreground">
        No memoir yet?{" "}
        <Link
          href="/onboarding"
          className="text-ink-soft underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
        >
          Start one
        </Link>
        .
      </p>
    </form>
  );
}
