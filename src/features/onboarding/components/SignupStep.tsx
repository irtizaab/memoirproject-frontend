"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  signupFormSchema,
  type MemoirSummary,
  type SignupFormValues,
} from "@/features/onboarding/schemas";

import { storeAnswers } from "@/features/onboarding/draftStorage";
import type { OnboardingState } from "@/features/onboarding/types";
import { isApiError } from "@/lib/api/errors";
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
  /**
   * Called once the memoir exists. Takes nothing: the claim response is
   * consumed by `useOnboardingDraft`, which seeds it into the `/me` cache, so
   * there is no reason to hand the same object round the component tree.
   */
  onClaimed: () => void;
  /**
   * True when this page load is the return leg of "Continue with Google".
   *
   * The account already exists by then — Supabase created it during the
   * redirect — so there is nothing to sign up and nothing to ask for. The only
   * thing still missing is the claim, which the password path does inline in
   * `onSubmit`. This runs it on arrival instead.
   */
  autoClaim?: boolean;
};

export function SignupStep({
  state,
  onBack,
  onClaim,
  isClaiming,
  claimError,
  onClaimed,
  autoClaim = false,
}: SignupStepProps) {
  // Once, not once per render. `onClaim` creates a memoir, and an account is
  // allowed exactly one — a second run would come back 409 and show the user a
  // conflict for something that had in fact just worked.
  const claimAttempted = useRef(false);

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

  useEffect(() => {
    if (!autoClaim || claimAttempted.current) return;
    claimAttempted.current = true;
    void onClaim(state)
      .then(onClaimed)
      // Intentionally swallowed: `claimError` renders the message below, and
      // the retry button re-runs exactly this call.
      .catch(() => {});
  }, [autoClaim, onClaim, onClaimed, state]);

  function retryClaim() {
    void onClaim(state).then(onClaimed).catch(() => {});
  }

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
      await onClaim(state);
      onClaimed();
    } catch {
      // Intentionally empty: `claimError` renders the message below.
    }
  }

  async function onGoogle() {
    setAuthError(null);
    try {
      // Park the answers before leaving. The draft id and token are already in
      // localStorage; these are the rest of the flow's state, which otherwise
      // dies with this page — React state does not survive a redirect to
      // Google and back.
      storeAnswers(state);
      await signInWithGoogle(`${window.location.origin}/onboarding`);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    }
  }

  /*
    An account owns one memoir. Someone who signs in with an existing email and
    runs onboarding again gets a 409 from `POST /memoirs/claim` — not because
    anything failed, but because they already have what they were making. The
    generic error text would send them looking for a bug, so this says what
    happened and where their archive is.

    The rule is enforced by `memoir_one_per_account` in migration 0007. Before
    it existed, a second run silently replaced the visible memoir and every
    memory in the first became unreachable.
  */
  const alreadyHasMemoir =
    isApiError(claimError) &&
    claimError.status === 409 &&
    !claimError.message.includes("email");

  const message = alreadyHasMemoir
    ? null
    : (authError ?? claimError?.message ?? null);

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
        {autoClaim
          ? "Signed in with Google. Putting the memoir somewhere safe."
          : "Nothing is saved yet. Everyone you invite gets in by link — you're the only one who ever needs an account."}
      </p>

      {/*
        The Google return leg. No form: the account exists, so email and
        password would be asking for something already given. What is left is
        the claim, which runs on mount — this is its progress and its retry.
      */}
      {autoClaim && (
        <div className={styles.stack}>
          {claimError && (
            <p role="alert" className={styles["ask-sub"]}>
              {claimError.message}
            </p>
          )}
          {alreadyHasMemoir && (
            <p role="alert" className={styles["ask-sub"]}>
              You already have a memoir on this account.{" "}
              <Link href="/archive" style={{ textDecoration: "underline" }}>
                Open your archive
              </Link>
              .
            </p>
          )}
          {!alreadyHasMemoir && (
            <button
              type="button"
              className={`${styles.btn} ${styles["btn-primary"]} ${styles["btn-block"]}`}
              onClick={retryClaim}
              disabled={isClaiming}
            >
              {isClaiming ? "Saving the memoir…" : "Try again"}
            </button>
          )}
        </div>
      )}

      {!autoClaim && (
      <form
        className={styles.stack}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
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

        {alreadyHasMemoir && (
          <p role="alert" className={styles["ask-sub"]}>
            You already have a memoir on this account.{" "}
            <Link href="/archive" style={{ textDecoration: "underline" }}>
              Open your archive
            </Link>
            .
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
      )}
    </div>
  );
}
