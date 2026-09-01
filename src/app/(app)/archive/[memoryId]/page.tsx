import type { Metadata } from "next";

import { MemoryDetail } from "@/features/archive";

export const metadata: Metadata = { title: "A memory" };

/**
 * One memory in full — what a card in the archive drills into.
 *
 * Thin, as every page here is. `params` is a Promise in this version of Next,
 * so it is awaited rather than destructured.
 *
 * A route rather than a modal: the address is shareable, refresh works, and the
 * browser's own back button does the obvious thing. A dialog would have needed
 * all three rebuilt by hand and got at least one of them wrong.
 */
export default async function MemoryPage({
  params,
}: {
  params: Promise<{ memoryId: string }>;
}) {
  const { memoryId } = await params;
  return <MemoryDetail memoryId={memoryId} />;
}
