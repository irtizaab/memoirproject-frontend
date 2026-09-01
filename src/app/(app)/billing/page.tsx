import type { Metadata } from "next";

import { BillingScreen } from "@/features/billing";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return <BillingScreen />;
}
