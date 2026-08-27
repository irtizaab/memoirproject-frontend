import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "New memory" };

/**
 * Shell only. The header is real and final; the body below it is a marker for
 * the feature that fills this screen in a later stage.
 */
export default function NewMemoryPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="NEW MEMORY"
        title="Begin with what you remember."
        description="Choose a way in. You can always return to refine, reorder, or add another fragment later."
      />
      <p className="font-sans text-sm text-ink-faint">Voice, photo and text capture arrive once the memories endpoints exist.</p>
    </div>
  );
}
