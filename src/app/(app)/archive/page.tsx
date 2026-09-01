import type { Metadata } from "next";

import { ArchiveScreen } from "@/features/archive";

export const metadata: Metadata = { title: "Archive" };

/**
 * Thin, as every page here is: it composes one feature component and does
 * nothing else. The screen is a client component because everything on it is
 * authenticated with a token held in the browser.
 */
export default function ArchivePage() {
  return <ArchiveScreen />;
}
