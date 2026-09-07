/**
 * Searching the archive, as its owner.
 *
 * Thin, like every page here: the screen is one feature component and the
 * credential is resolved inside it. The twin route is `/m/[token]/search`,
 * which renders the same component with the reader's credential instead.
 */

import type { Metadata } from "next";

import { OwnerSearch } from "@/features/search/components/OwnerSearch";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return <OwnerSearch />;
}
