import type { Metadata } from "next";

import { QuestionsScreen } from "@/features/questions";

export const metadata: Metadata = { title: "Questions" };

export default function QuestionsPage() {
  return <QuestionsScreen />;
}
