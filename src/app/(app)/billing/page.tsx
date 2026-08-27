import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Billing" };

/**
 * Shell only. The header is real and final; the body below it is a marker for
 * the feature that fills this screen in a later stage.
 */
export default function BillingPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="BILLING"
        title="A home for every remembered thing."
        description="Keep your growing archive safe, shareable, and ready for the years ahead."
      />
      <p className="font-sans text-sm text-ink-faint">The plan card and the storage meter arrive once media uploads are recording their size.</p>
    </div>
  );
}
