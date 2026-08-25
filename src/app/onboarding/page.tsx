import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";

import { OnboardingFlow } from "@/features/onboarding";

// Scoped to this route rather than the root layout: the rest of the app uses
// Geist, and this flow's serif/ivory look is deliberately its own thing.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "The Memoir Project — Onboarding",
};

export default function OnboardingPage() {
  return (
    <div className={`${spectral.variable} ${inter.variable}`}>
      <OnboardingFlow />
    </div>
  );
}
