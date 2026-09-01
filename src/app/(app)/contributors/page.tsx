import type { Metadata } from "next";

import { ContributorsScreen } from "@/features/contributors";

export const metadata: Metadata = { title: "Contributors" };

export default function ContributorsPage() {
  return <ContributorsScreen />;
}
