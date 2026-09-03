import type { Metadata } from "next";

import { ContributorMemories } from "@/features/contributors";

export const metadata: Metadata = { title: "A contributor" };

/**
 * What one person has added.
 *
 * Thin, as every page here is. `params` is a Promise in this version of Next,
 * so it is awaited rather than destructured.
 */
export default async function ContributorPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  return <ContributorMemories participantId={participantId} />;
}
