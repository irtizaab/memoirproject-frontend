import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Contributors" };

/**
 * Shell only. The header is real and final; the body below it is a marker for
 * the feature that fills this screen in a later stage.
 */
export default function ContributorsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="CONTRIBUTORS"
        title="Everyone who remembers."
        description="The people you have invited, what they have added, and the single link that let them in."
      />
      <p className="font-sans text-sm text-ink-faint">The participant list and link management arrive with the contributors feature.</p>
    </div>
  );
}
