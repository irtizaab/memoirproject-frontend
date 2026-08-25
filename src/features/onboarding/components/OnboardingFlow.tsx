"use client";

import { useEffect, useState } from "react";

import {
  QUESTION_STEPS,
  STEP_ORDER,
  type OnboardingState,
  type QuestionStep,
  type Step,
} from "@/features/onboarding/types";

import styles from "../onboarding.module.css";
import { BackgroundLayer } from "./BackgroundLayer";
import { ConfirmStep } from "./ConfirmStep";
import { DashboardStep } from "./DashboardStep";
import { DeepStep } from "./DeepStep";
import { LandingStep } from "./LandingStep";
import { NameStep } from "./NameStep";
import { PayStep } from "./PayStep";
import { PricingStep } from "./PricingStep";
import { PublishedStep } from "./PublishedStep";
import { RelationStep } from "./RelationStep";
import { ReviewStep } from "./ReviewStep";
import { SignupStep } from "./SignupStep";
import { Stepper } from "./Stepper";
import { WorkingStep } from "./WorkingStep";
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
  collected: false,
  term: "monthly",
};

function isQuestionStep(step: Step): step is QuestionStep {
  return (QUESTION_STEPS as Step[]).includes(step);
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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

  return (
    <div className={styles.shell}>
      <BackgroundLayer step={step} />

      {step === "landing" && <LandingStep onPledge={() => go("name")} />}

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
              onNext={() => go("rel")}
            />
          )}
          {step === "rel" && (
            <RelationStep
              name={state.name}
              rel={state.rel}
              relLabel={state.relLabel}
              onChange={update}
              onNext={() => go("years")}
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
                go("deep");
              }}
            />
          )}
          {step === "deep" && (
            <DeepStep
              name={state.name}
              deep={state.deep}
              onChange={(deep) => update({ deep })}
              onNext={() => go("signup")}
            />
          )}
        </div>
      )}

      {step === "signup" && (
        <SignupStep state={state} onBack={() => go("deep")} onNext={() => go("pricing")} />
      )}
      {step === "pricing" && (
        <PricingStep
          state={state}
          onChangeTerm={(term) => update({ term })}
          onNext={() => go("pay")}
        />
      )}
      {step === "pay" && (
        <PayStep state={state} onBack={() => go("pricing")} onNext={() => go("dash")} />
      )}
      {step === "dash" && (
        <DashboardStep
          state={state}
          onCollect={() => update({ collected: true })}
          onOrganize={() => go("working")}
        />
      )}
      {step === "working" && <WorkingStep onDone={() => go("review")} />}
      {step === "review" && (
        <ReviewStep onSave={() => go("dash")} onPublish={() => go("confirm")} />
      )}
      {step === "confirm" && (
        <ConfirmStep onBack={() => go("review")} onPublish={() => go("published")} />
      )}
      {step === "published" && <PublishedStep state={state} />}
    </div>
  );
}
