"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useActiveMemoir } from "@/features/account";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { takeAnswers } from "@/features/onboarding/draftStorage";
import { supabase } from "@/lib/supabase/client";
import { toDraftUpdate, useOnboardingDraft } from "@/features/onboarding/hooks";
import {
  QUESTION_STEPS,
  STEP_ORDER,
  type OnboardingState,
  type QuestionStep,
  type Step,
} from "@/features/onboarding/types";

import styles from "../onboarding.module.css";
import { BackgroundLayer } from "./BackgroundLayer";
import { DeepStep } from "./DeepStep";
import { LandingStep } from "./LandingStep";
import { NameStep } from "./NameStep";
import { PayStep } from "./PayStep";
import { PricingStep } from "./PricingStep";
import { RelationStep } from "./RelationStep";
import { SignupStep } from "./SignupStep";
import { Stepper } from "./Stepper";
import { YearsStep } from "./YearsStep";

const INITIAL_STATE: OnboardingState = {
  name: "",
  rel: null,
  relLabel: "",
  deep: "",
  born: "",
  bornSet: false,
  through: String(new Date().getFullYear()),
  throughSet: false,
  term: "month",
};

function isQuestionStep(step: Step): step is QuestionStep {
  return (QUESTION_STEPS as Step[]).includes(step);
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  // Set only by the Google return leg below, and read only by `SignupStep`.
  const [resumedFromGoogle, setResumedFromGoogle] = useState(false);

  const { ensureDraft, saveAnswers, claim, isClaiming, claimError } =
    useOnboardingDraft();

  // Both only consulted by the landing guard below.
  const { memoir } = useActiveMemoir();
  const { session, isPending: sessionPending } = useSupabaseSession();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /**
   * Somebody who already has a memoir does not belong at the start of this.
   *
   * Pressing Back from `/archive` lands here, and without this guard a second
   * run would create a second memoir — which `useActiveMemoir` would then pick
   * as the active one, since it takes `memoirs[0]` and the backend returns
   * them newest first. Their real archive would appear to have emptied itself.
   *
   * Gated on `landing` specifically: `pricing` and `pay` run with both a
   * session and a memoir by design, and bouncing those would make it
   * impossible to reach them at all.
   */
  useEffect(() => {
    /*
      Gated on a live session as well as a memoir, and the session half is what
      stops an infinite redirect.

      `memoir` comes from the query cache. Signing out clears the session but
      not necessarily that cache, so a memoir could still be visible here with
      nobody signed in — this would send them to /archive, `RequireSession`
      would send them back, and neither screen would ever settle. AppHeader now
      clears the cache on sign-out too; this is the second wall, because a guard
      that loops is a far worse failure than one that redirects a beat late.
    */
    if (step === "landing" && !sessionPending && session && memoir) {
      router.replace("/archive");
    }
  }, [step, memoir, session, sessionPending, router]);

  /**
   * Coming back from "Continue with Google".
   *
   * That button leaves the site, so the browser returns to a *fresh page load*
   * — this component remounts at `landing` with `INITIAL_STATE`, and every
   * answer the user gave is gone from React state. Nothing then calls
   * `claim()` either, because its only call site is the password form's submit
   * handler, which the Google user never touches. The result was a signed-in
   * account, an unclaimed draft, and an archive reporting no memoir: the whole
   * flow silently undone by the one button that navigates away.
   *
   * Driven by the auth event rather than by `useSupabaseSession`, because the
   * session does not exist yet when this mounts — `detectSessionInUrl` has to
   * exchange the code Google put in the URL first, and this is the callback
   * that fires when it has.
   *
   * `takeAnswers` returns non-null only on that return leg: the answers are
   * written immediately before the redirect and cleared the moment they are
   * read. So this cannot fire on an ordinary visit, on a token refresh, or
   * twice.
   */
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) return;

      const answers = takeAnswers();
      if (!answers) return;

      setState(answers);
      setResumedFromGoogle(true);
      setStep("signup");
    });

    return () => data.subscription.unsubscribe();
  }, []);

  function go(to: Step) {
    setStep(to);
  }

  function back() {
    const i = STEP_ORDER.indexOf(step);
    setStep(STEP_ORDER[Math.max(0, i - 1)]);
  }

  function update(patch: Partial<OnboardingState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  /**
   * Advance to the next question, saving what was just answered.
   *
   * The save is fired, not awaited: a slow request must not make the next
   * question feel sluggish. Losing one is survivable because the signup step
   * re-sends every answer before claiming.
   */
  function advance(to: Step, patch: Parameters<typeof saveAnswers>[0]) {
    saveAnswers(patch);
    go(to);
  }

  return (
    <div className={`${styles.shell} palette-light`}>
      <BackgroundLayer step={step} />

      {/*
        Creating the draft here, rather than on page load, means a visitor who
        never starts does not leave an empty row behind. `ensureDraft` restores
        an existing draft from localStorage if they are coming back.
      */}
      {step === "landing" && (
        <LandingStep
          onPledge={() => {
            void ensureDraft();
            go("name");
          }}
        />
      )}

      {isQuestionStep(step) && (
        <div className={`${styles.sheet} ${styles.step}`}>
          <div className={styles["sheet-top"]}>
            <button
              type="button"
              className={`${styles.back} ${step !== "name" ? styles.on : ""}`}
              onClick={back}
            >
              ← Back
            </button>
            <span />
          </div>
          <div className={styles.counter}>
            <Stepper current={step} />
            <div className={styles.eyebrow}>
              Question {QUESTION_STEPS.indexOf(step) + 1} of{" "}
              {QUESTION_STEPS.length}
            </div>
          </div>

          {step === "name" && (
            <NameStep
              name={state.name}
              onChange={(name) => update({ name })}
              onNext={() => advance("rel", { subject_name: state.name.trim() })}
            />
          )}
          {step === "rel" && (
            <RelationStep
              name={state.name}
              rel={state.rel}
              relLabel={state.relLabel}
              onChange={update}
              onNext={() => advance("years", toDraftUpdate(state))}
            />
          )}
          {step === "years" && (
            <YearsStep
              name={state.name}
              born={state.born}
              bornSet={state.bornSet}
              through={state.through}
              throughSet={state.throughSet}
              onCommit={(patch) => {
                update(patch);
                // Built from `patch`, not `state` — setState is asynchronous,
                // so `state` here is still the pre-commit value.
                advance("deep", toDraftUpdate({ ...state, ...patch }));
              }}
            />
          )}
          {step === "deep" && (
            <DeepStep
              name={state.name}
              deep={state.deep}
              onChange={(deep) => update({ deep })}
              onNext={() =>
                advance("signup", { never_forget: state.deep.trim() || null })
              }
            />
          )}
        </div>
      )}

      {/*
        The hinge. `onClaimed` fires only after the backend has created the
        memoir, so nothing past this point is showing invented data. The claim
        response itself is consumed by `useOnboardingDraft`, which seeds it
        into the `/me` cache — which is why `/archive` renders the subject's
        name instantly at the end of this flow rather than after a round trip.
      */}
      {step === "signup" && (
        <SignupStep
          state={state}
          onBack={() => go("deep")}
          onClaim={claim}
          isClaiming={isClaiming}
          claimError={claimError}
          onClaimed={() => go("pricing")}
          autoClaim={resumedFromGoogle}
        />
      )}
      {step === "pricing" && (
        <PricingStep
          state={state}
          onChangeTerm={(term) => update({ term })}
          onNext={() => go("pay")}
        />
      )}

      {/*
        The end of onboarding, and the beginning of the product.
        `router.push`, not `window.location` — a client navigation keeps the
        query cache the claim just seeded, so the archive is already holding
        this memoir when it mounts.
      */}
      {step === "pay" && (
        <PayStep
          state={state}
          onBack={() => go("pricing")}
          onDone={() => router.push("/archive")}
        />
      )}
    </div>
  );
}
