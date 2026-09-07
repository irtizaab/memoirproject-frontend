/**
 * The SERVER data path.
 *
 * The default path in this codebase, and available here for the same reason
 * `features/invitation` has one: a family opening a memoir on a phone on a
 * train gets the prose in the first response rather than a spinner and a
 * second round trip.
 *
 * The reader session is what makes that still possible now the memoir is
 * behind a passphrase. It is kept in a cookie rather than `localStorage`
 * precisely so it arrives with the request — see `readerSession.ts` — and the
 * page reads it and passes it in here.
 *
 * The comment layer is the exception and lives in `hooks.ts`, because it
 * changes in response to the person reading.
 */

import "server-only";

import { getChapter, getReading } from "@/features/memoir/api";
import type { Chapter, MemoirReading } from "@/features/memoir/schemas";

/** The book's covers, for the title page and the contents rail. */
export async function fetchReading(
  token: string,
  reader: string | null,
): Promise<MemoirReading> {
  return getReading(token, reader, { cache: "no-store" });
}

/** One chapter, whole. */
export async function fetchChapter(
  token: string,
  chapterId: string,
  reader: string | null,
): Promise<Chapter> {
  return getChapter(token, chapterId, reader, { cache: "no-store" });
}
