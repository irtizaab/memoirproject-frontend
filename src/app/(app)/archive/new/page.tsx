import type { Metadata } from "next";

import { MemoryComposer } from "@/features/archive";

export const metadata: Metadata = { title: "New memory" };

export default function NewMemoryPage() {
  return <MemoryComposer />;
}
