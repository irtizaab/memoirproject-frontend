/**
 * The reader's calls to the backend.
 *
 * The only file that knows these paths exist. Everything goes through
 * `apiRequest`, which owns the base URL, the timeout, and validating the
 * response before it is allowed any further into the app.
 *
 * Almost every call here is addressed by a **view link token**, sent in the
 * path for the entry point and in `X-Link-Token` for everything after it. That
 * is the product working as designed: the family reading a finished memoir
 * have no accounts and never will.
 *
 * The two exceptions are at the bottom, and they are the same book read by the
 * one person who does have an account. An owner has to be able to read their
 * memoir **before** they seal it — no view link exists yet, and sealing is
 * irreversible, so "read it through first" cannot depend on the thing that
 * only publication creates. Those two carry a bearer token and nothing else,
 * and they are kept apart from the rest of the file so no link-addressed call
 * can quietly grow a second credential.
 *
 * `openMemoir` is the one call that will carry a bearer token, and it is passed
 * in by the gate rather than read here — the owner opening their own memoir is
 * recognised by their account and let through without a passphrase. Reading
 * the session inside this file would make every other call look like it might
 * do the same.
 *
 * Since the door, every call carries a second header. `X-Link-Token` says which
 * memoir; `X-Reader-Token` says who is holding the link, and is only issued by
 * `openMemoir` in exchange for the passphrase. A link that has been forwarded
 * to somebody who was never told it opens nothing.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  chapterEditSchema,
  chapterSchema,
  readerSessionSchema,
  commentCreateSchema,
  commentReceiptSchema,
  commentThreadSchema,
  memoirReadingSchema,
  type Chapter,
  type ChapterEdit,
  type CommentCreate,
  type CommentReceipt,
  type CommentThread,
  type MemoirReading,
  type ReaderOpen,
  type ReaderSession,
} from "@/features/memoir/schemas";

const ENDPOINTS = {
  open: (token: string) => `/r/${encodeURIComponent(token)}/open`,
  reading: (token: string) => `/r/${encodeURIComponent(token)}`,
  chapter: (chapterId: string) => `/chapters/${chapterId}`,
  comments: (chapterId: string) => `/chapters/${chapterId}/comments`,
  ownerReading: (memoirId: string) => `/memoirs/${memoirId}/chapters`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/**
 * The two headers that stand in for a session, for somebody who has no account.
 *
 * `reader` is optional in the type and required in practice: without it the
 * backend answers 404 exactly as it would for a link that never existed. The
 * calls take it as an argument rather than reading it from a cookie here,
 * because half of them run on the server, where there is no `document`.
 */
function linkHeaders(
  token: string,
  reader?: string | null,
): Record<string, string> {
  return reader
    ? { "X-Link-Token": token, "X-Reader-Token": reader }
    : { "X-Link-Token": token };
}

/**
 * The comment layer's credential: the link, or — with no link, the owner
 * reading their own draft on `/preview` — their bearer token.
 */
async function commentHeaders(
  token: string | null,
  reader: string | null,
): Promise<Record<string, string>> {
  return token ? linkHeaders(token, reader) : authHeaders();
}

/**
 * The door: a passphrase and a name, for a session.
 *
 * The only call in this file that does not already need one. Everything it can
 * fail on — an unknown link, a revoked one, the wrong passphrase — comes back
 * as the same 404, so the gate has exactly one thing to say and cannot
 * accidentally tell somebody they have found a real memoir.
 */
export async function openMemoir(
  token: string,
  body: ReaderOpen,
  options: RequestOptions & { headers?: Record<string, string> } = {},
): Promise<ReaderSession> {
  return apiRequest({
    path: ENDPOINTS.open(token),
    method: "POST",
    body,
    schema: readerSessionSchema,
    ...options,
  });
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
  reader: string | null,
  options: RequestOptions = {},
): Promise<MemoirReading> {
  return apiRequest({
    path: ENDPOINTS.reading(token),
    method: "GET",
    headers: linkHeaders(token, reader),
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
  reader: string | null,
  options: RequestOptions = {},
): Promise<Chapter> {
  return apiRequest({
    path: ENDPOINTS.chapter(chapterId),
    method: "GET",
    headers: linkHeaders(token, reader),
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
  token: string | null,
  chapterId: string,
  reader: string | null,
  options: RequestOptions = {},
): Promise<CommentThread[]> {
  return apiRequest({
    path: ENDPOINTS.comments(chapterId),
    method: "GET",
    headers: await commentHeaders(token, reader),
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
 * Nobody says who they are here. The session does, which is why every
 * reflection in a memoir is signed rather than optionally signed.
 */
export async function postComment(
  token: string | null,
  chapterId: string,
  reader: string | null,
  comment: CommentCreate,
  options: RequestOptions = {},
): Promise<CommentReceipt> {
  const body = commentCreateSchema.parse(comment);

  return apiRequest({
    path: ENDPOINTS.comments(chapterId),
    method: "POST",
    body,
    headers: await commentHeaders(token, reader),
    schema: commentReceiptSchema,
    ...options,
  });
}

/* -------------------------------------------------------------------------- */
/*  The owner, reading their own memoir before anybody else can               */
/* -------------------------------------------------------------------------- */

/**
 * The covers, for the owner. The same response `getReading` returns.
 *
 * `GET /memoirs/{id}/chapters` exists for exactly this and answers 404 — never
 * 403 — for a memoir that is not theirs, so the shape of a failure here says
 * nothing a stranger could use.
 */
export async function getOwnerReading(
  memoirId: string,
  options: RequestOptions = {},
): Promise<MemoirReading> {
  return apiRequest({
    path: ENDPOINTS.ownerReading(memoirId),
    method: "GET",
    headers: await authHeaders(),
    schema: memoirReadingSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * One page of the book, corrected by hand. Owner only, and only before sealing.
 *
 * Validated on the way out as well as the way in, so a malformed payload fails
 * at the call site with a readable message rather than as a 422.
 *
 * The response is the chapter as it now stands — freshly signed photograph URLs
 * and re-surveyed credits included — so the page the owner is looking at is
 * replaced by what was actually stored rather than by what was sent.
 */
export async function editChapter(
  chapterId: string,
  edit: ChapterEdit,
  options: RequestOptions = {},
): Promise<Chapter> {
  const body = chapterEditSchema.parse(edit);

  return apiRequest({
    path: ENDPOINTS.chapter(chapterId),
    method: "PATCH",
    body,
    headers: await authHeaders(),
    schema: chapterSchema,
    ...options,
  });
}

/**
 * One chapter, for the owner.
 *
 * Same route as the reader's, a different credential — the backend tries the
 * stronger one first, so an owner reading an unpublished chapter does not
 * depend on a link existing.
 */
export async function getOwnerChapter(
  chapterId: string,
  options: RequestOptions = {},
): Promise<Chapter> {
  return apiRequest({
    path: ENDPOINTS.chapter(chapterId),
    method: "GET",
    headers: await authHeaders(),
    schema: chapterSchema,
    cache: "no-store",
    ...options,
  });
}
