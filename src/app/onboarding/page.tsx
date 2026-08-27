import type { Metadata } from "next";

import { OnboardingFlow } from "@/features/onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
};

/**
 * Sits outside the `(app)` route group on purpose: this is the one screen a
 * signed-out visitor is meant to reach, and it carries no navigation, because
 * there is nowhere to navigate to until the memoir exists.
 *
 * Fonts and palette now come from the root layout — this route used to load
 * Spectral and Inter itself, back when it was the only designed screen.
 */
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
