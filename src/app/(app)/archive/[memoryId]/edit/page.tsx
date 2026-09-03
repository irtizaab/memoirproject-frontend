import type { Metadata } from "next";

import { MemoryEditor } from "@/features/archive";

export const metadata: Metadata = { title: "Editing a memory" };

/**
 * Editing one memory.
 *
 * A route rather than a mode on the detail page, so the address is shareable,
 * refresh works, and Cancel is just the browser's back button doing the obvious
 * thing.
 *
 * Thin, as every page here is. `params` is a Promise in this version of Next,
 * so it is awaited rather than destructured.
 */
export default async function EditMemoryPage({
  params,
}: {
  params: Promise<{ memoryId: string }>;
}) {
  const { memoryId } = await params;
  return <MemoryEditor memoryId={memoryId} />;
}
