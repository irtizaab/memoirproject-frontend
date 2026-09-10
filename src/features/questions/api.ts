/**
 * The questions screen's calls to the backend.
 *
 * Every one of them is the owner's — bearer token, `authHeaders()`. The
 * contributor's single read lives in `features/invitation/api.ts`, because it
 * takes a link token instead and returns a much smaller thing.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import { z } from "zod";

import {
  questionLibrarySchema,
  questionSchema,
  type Question,
  type QuestionLibrary,
  type QuestionsMode,
} from "@/features/questions/schemas";

const ENDPOINTS = {
  library: (memoirId: string) => `/memoirs/${memoirId}/questions`,
  generate: (memoirId: string) => `/memoirs/${memoirId}/questions/generate`,
  mode: (memoirId: string) => `/memoirs/${memoirId}/questions/mode`,
  question: (id: string) => `/questions/${encodeURIComponent(id)}`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/** The mode, the notes, the library and the shipped set, in one response. */
export async function getLibrary(
  memoirId: string,
  options: RequestOptions = {},
): Promise<QuestionLibrary> {
  return apiRequest({
    path: ENDPOINTS.library(memoirId),
    method: "GET",
    headers: await authHeaders(),
    schema: questionLibrarySchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * How long to let a draft run before giving up, in milliseconds.
 *
 * Writing four or five questions for each of six groups measures at 10–13
 * seconds, and the app's default timeout is 10 — so this call failed in the
 * browser essentially every time while the backend went on to finish and save
 * the library. The owner saw "these could not be written just now" over a set
 * of questions that had, in fact, just been written.
 *
 * Two minutes rather than fifteen seconds because the backend retries a
 * momentarily overloaded model twice with a backoff before giving up, and this
 * has to outlast that or the retry only ever makes the failure slower. Nobody
 * is blocked while it runs — the screen says "Writing…" and the rest of the
 * app is still there.
 */
const GENERATE_TIMEOUT_MS = 120_000;

/**
 * Draft a library from what the owner has said about the subject.
 *
 * Returns the whole screen, so nothing refetches after this resolves.
 *
 * Throws an `ApiError` with status 503 when the model could not write one —
 * unreachable, refused, or switched off. Nothing is broken in that case and
 * nothing is lost: the notes are saved before the call, and the standard
 * questions are still there.
 *
 * `replaceEdited` is the owner saying "start again". Left off, a rewrite
 * replaces what the model wrote and keeps what they wrote themselves.
 */
export async function generateLibrary(
  memoirId: string,
  notes: string | null,
  replaceEdited = false,
  options: RequestOptions = {},
): Promise<QuestionLibrary> {
  return apiRequest({
    path: ENDPOINTS.generate(memoirId),
    method: "POST",
    headers: await authHeaders(),
    body: { notes, replace_edited: replaceEdited },
    schema: questionLibrarySchema,
    cache: "no-store",
    timeoutMs: GENERATE_TIMEOUT_MS,
    ...options,
  });
}

/** Choose which set contributors see. Destroys nothing either way. */
export async function setMode(
  memoirId: string,
  mode: QuestionsMode,
  options: RequestOptions = {},
): Promise<QuestionLibrary> {
  return apiRequest({
    path: ENDPOINTS.mode(memoirId),
    method: "PATCH",
    headers: await authHeaders(),
    body: { mode },
    schema: questionLibrarySchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * Rewrite one question by hand.
 *
 * The response comes back with `source: "owner"`, which is what makes this
 * question survive the next rewrite.
 */
export async function updateQuestion(
  questionId: string,
  body: string,
  options: RequestOptions = {},
): Promise<Question> {
  return apiRequest({
    path: ENDPOINTS.question(questionId),
    method: "PATCH",
    headers: await authHeaders(),
    body: { body },
    schema: questionSchema,
    cache: "no-store",
    ...options,
  });
}

/** Delete one question. 204, so the schema is `undefined`. */
export async function deleteQuestion(
  questionId: string,
  options: RequestOptions = {},
): Promise<void> {
  await apiRequest({
    path: ENDPOINTS.question(questionId),
    method: "DELETE",
    headers: await authHeaders(),
    schema: z.undefined(),
    cache: "no-store",
    ...options,
  });
}
