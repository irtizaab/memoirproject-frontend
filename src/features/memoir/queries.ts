/**
 * The SERVER data path.
 *
 * The default path in this codebase, and available here for the same reason
 * `features/invitation` has one: a view link needs no browser-held credential,
 * so the whole book can be rendered as HTML on the server. A family opening a
 * memoir on a phone on a train gets the prose in the first response rather
 * than a spinner and a second round trip.
 *
 * The comment layer is the exception and lives in `hooks.ts`, because it
 * changes in response to the person reading.
 */

import "server-only";

import { getChapter, getReading } from "@/features/memoir/api";
import type { Chapter, MemoirReading } from "@/features/memoir/schemas";

/** The book's covers, for the title page and the contents rail. */
export async function fetchReading(token: string): Promise<MemoirReading> {
  return getReading(token, { cache: "no-store" });
}

/** One chapter, whole. */
export async function fetchChapter(
  token: string,
  chapterId: string,
): Promise<Chapter> {
  return getChapter(token, chapterId, { cache: "no-store" });
}
