import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Archive" };

/**
 * Shell only. The header is real and final; the body below it is a marker for
 * the feature that fills this screen in a later stage.
 */
export default function ArchivePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="YOUR LIVING ARCHIVE"
        title="Your archive, held close."
        description="Collect the voices, images, and fragments that deserve a longer life. Every memory is yours to shape, revisit, and share."
      />
      <p className="font-sans text-sm text-ink-faint">
        The subject&apos;s name, the invite banner and the memories themselves
        arrive with the archive feature.
      </p>
    </div>
  );
}
