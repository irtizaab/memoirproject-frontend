/**
 * The reader's calls to the backend.
 *
 * The only file that knows these paths exist. Everything goes through
 * `apiRequest`, which owns the base URL, the timeout, and validating the
 * response before it is allowed any further into the app.
 *
 * Every call here is addressed by a **view link token**, sent in the path for
 * the entry point and in `X-Link-Token` for everything after it. There is no
 * `authHeaders()` anywhere in this file, and that is the product working as
 * designed: the family reading a finished memoir have no accounts and never
 * will. The backend accepts an owner's bearer token on the same routes, which
 * is how the owner previews — but that path belongs to a screen inside `(app)`
 * and not to this one.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import {
  chapterSchema,
  commentCreateSchema,
  commentReceiptSchema,
  commentThreadSchema,
  memoirReadingSchema,
  type Chapter,
  type CommentCreate,
  type CommentReceipt,
  type CommentThread,
  type MemoirReading,
} from "@/features/memoir/schemas";

const ENDPOINTS = {
  reading: (token: string) => `/r/${encodeURIComponent(token)}`,
  chapter: (chapterId: string) => `/chapters/${chapterId}`,
  comments: (chapterId: string) => `/chapters/${chapterId}/comments`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/** The header that stands in for a session, for somebody who has none. */
function linkHeaders(token: string): Record<string, string> {
  return { "X-Link-Token": token };
}

/**
 * The book's covers: who it is about, its contents, its colophon.
 *
 * `cache: "no-store"` by default, for the same reason `getInvitation` uses it:
 * the backend honours revocation, and a cached response would keep serving a
 * memoir after its link had been killed.
 */
export async function getReading(
  token: string,
  options: RequestOptions = {},
): Promise<MemoirReading> {
  return apiRequest({
    path: ENDPOINTS.reading(token),
    method: "GET",
    schema: memoirReadingSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * One chapter: prose, photographs, sources and the conversation, together.
 *
 * One call rather than four. A chapter is one page, and four round trips to
 * draw it is four chances to show half of one.
 */
export async function getChapter(
  token: string,
  chapterId: string,
  options: RequestOptions = {},
): Promise<Chapter> {
  return apiRequest({
    path: ENDPOINTS.chapter(chapterId),
    method: "GET",
    headers: linkHeaders(token),
    schema: chapterSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * Just the conversation.
 *
 * `getChapter` already carries it, so this is only reached when the one thing
 * that changes after the page is drawn actually changes — somebody else
 * commenting. Re-fetching the chapter would re-sign every photograph in it.
 */
export async function listThreads(
  token: string,
  chapterId: string,
  options: RequestOptions = {},
): Promise<CommentThread[]> {
  return apiRequest({
    path: ENDPOINTS.comments(chapterId),
    method: "GET",
    headers: linkHeaders(token),
    schema: commentThreadSchema.array(),
    cache: "no-store",
    ...options,
  });
}

/**
 * Say something about a passage, or reply to somebody who did.
 *
 * Validated on the way out as well as the way in, so a malformed payload fails
 * at the call site with a readable message rather than as a 422.
 *
 * The receipt carries `participant_token`. Hold on to it and send it next
 * time, or the same person appears in the memoir twice.
 */
export async function postComment(
  token: string,
  chapterId: string,
  comment: CommentCreate,
  options: RequestOptions = {},
): Promise<CommentReceipt> {
  const body = commentCreateSchema.parse(comment);

  return apiRequest({
    path: ENDPOINTS.comments(chapterId),
    method: "POST",
    body,
    headers: linkHeaders(token),
    schema: commentReceiptSchema,
    ...options,
  });
}
