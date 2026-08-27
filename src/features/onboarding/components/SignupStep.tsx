"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  signupFormSchema,
  type MemoirSummary,
  type SignupFormValues,
} from "@/features/onboarding/schemas";
import type { OnboardingState } from "@/features/onboarding/types";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/supabase/client";

import styles from "../onboarding.module.css";
import { BookCover } from "./BookCover";

type SignupStepProps = {
  state: OnboardingState;
  onBack: () => void;
  /** Re-sends every answer, then claims the draft into a real memoir. */
  onClaim: (state: OnboardingState) => Promise<MemoirSummary>;
  isClaiming: boolean;
  claimError: Error | null;
  onClaimed: (memoir: MemoirSummary) => void;
};

export function SignupStep({
  state,
  onBack,
  onClaim,
  isClaiming,
  claimError,
  onClaimed,
}: SignupStepProps) {
  // Auth errors, kept separate from claim errors: they fail for different
  // reasons and only one of them is worth retrying with the same input.
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isAuthenticating || isClaiming;

  /**
   * Sign up, then claim — in that order, and both before advancing.
   *
   * The claim needs a verified identity, so it cannot run until Supabase has
   * issued a token. Advancing before it succeeds would show the user a
   * dashboard for a memoir that does not exist.
   */
  async function onSubmit(values: SignupFormValues) {
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      try {
        await signUpWithPassword(values.email, values.password);
      } catch (error) {
        // An existing email is not a failure here — someone coming back to
        // start a second memoir signs in with the same credentials. Any other
        // error (weak password, confirmation required) is real and surfaces.
        const message = error instanceof Error ? error.message : "";
        if (!/already|registered|exists/i.test(message)) throw error;

        await signInWithPassword(values.email, values.password);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not create your account.",
      );
      return;
    } finally {
      setIsAuthenticating(false);
    }

    // Errors here are surfaced through `claimError` by the parent's mutation,
    // so there is nothing to catch — a failed claim simply does not advance.
    try {
      onClaimed(await onClaim(state));
    } catch {
      // Intentionally empty: `claimError` renders the message below.
    }
  }

  async function onGoogle() {
    setAuthError(null);
    try {
      // Comes back to this same page. The draft id and token are already in
      // localStorage, so the flow can be picked up after the redirect.
      await signInWithGoogle(`${window.location.origin}/onboarding`);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    }
  }

  const message = authError ?? claimError?.message ?? null;

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["sheet-top"]}>
        <button
          type="button"
          className={`${styles.back} ${styles.on}`}
          onClick={onBack}
          disabled={busy}
        >
          ← Back
        </button>
        <span />
      </div>
      <div className={styles["cover-wrap"]}>
        <BookCover
          name={state.name}
          born={state.born}
          bornSet={state.bornSet}
          through={state.through}
        />
      </div>
      <h2
        className={styles.ask}
        style={{ fontSize: "clamp(24px,4vw,32px)", marginTop: 34 }}
      >
        Keep this safe
      </h2>
      <p className={styles["ask-sub"]}>
        Nothing is saved yet. Everyone you invite gets in by link —
        you&apos;re the only one who ever needs an account.
      </p>

      <form className={styles.stack} onSubmit={handleSubmit(onSubmit)} noValidate>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-outline"]} ${styles["btn-block"]}`}
          onClick={onGoogle}
          disabled={busy}
        >
          Continue with Google
        </button>
        <div className={styles.divider}>or</div>

        <div className={styles.field}>
          <label htmlFor="f-email">Your email</label>
          <input
            id="f-email"
            className={styles["rule-input"]}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className={styles["ask-sub"]}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="f-pass">Choose a password</label>
          <input
            id="f-pass"
            className={styles["rule-input"]}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className={styles["ask-sub"]}>
              {errors.password.message}
            </p>
          )}
        </div>

        {message && (
          <p role="alert" className={styles["ask-sub"]}>
            {message}
          </p>
        )}

        <button
          type="submit"
          className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
          disabled={busy}
        >
          {isClaiming
            ? "Saving the memoir…"
            : isAuthenticating
              ? "Creating your account…"
              : "Save the memoir"}
        </button>
      </form>
    </div>
  );
}
