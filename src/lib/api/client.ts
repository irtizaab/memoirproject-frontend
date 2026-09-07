/**
 * The HTTP client — the frontend twin of the backend's `src/integrations/`.
 *
 * This is the ONLY module in the app that calls `fetch`. Features describe
 * *what* they want (path, body, response schema); this module owns *how* it
 * happens: base URL, headers, timeouts, error normalization, and validating
 * the response before it is allowed any further into the app.
 *
 * It runs unchanged on the server and in the browser, which is what lets a
 * feature expose both a server fetcher and a client hook over one definition.
 */

import { unstable_rethrow } from "next/navigation";
import type { ZodType, z } from "zod";

import { env } from "@/lib/config/env";
import { ApiError, readErrorDetail } from "@/lib/api/errors";

/** Caching hints. Server-only — Next.js ignores these in the browser. */
export type ApiRequestCaching = {
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

export type ApiRequestOptions<TSchema extends ZodType> = ApiRequestCaching & {
  /** Path on the backend, e.g. `/example/greet`. */
  path: string;
  /** Schema the response must satisfy. Required — no unvalidated responses. */
  schema: TSchema;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Serialized as JSON when present. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Caller's abort signal, combined with the timeout. */
  signal?: AbortSignal;
};

/**
 * Performs a request and returns the parsed, validated response body.
 *
 * @throws {ApiError} always — never a raw fetch, JSON, or Zod error.
 */
export async function apiRequest<TSchema extends ZodType>({
  path,
  schema,
  method = "GET",
  body,
  headers,
  signal,
  cache,
  next,
}: ApiRequestOptions<TSchema>): Promise<z.infer<TSchema>> {
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;

  const timeout = AbortSignal.timeout(env.NEXT_PUBLIC_API_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([timeout, signal])
    : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: combinedSignal,
      cache,
      next,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // Next.js signals control flow by throwing: `notFound()`, `redirect()`,
    // and the internal bail-out that switches a route from static to dynamic
    // rendering. Those are not our errors to catch — swallowing them breaks
    // the framework in ways that only show up at build time.
    unstable_rethrow(cause);
    throw ApiError.network(url, cause);
  }

  if (!response.ok) {
    throw ApiError.http(url, response.status, await readErrorDetail(response));
  }

  // 204 No Content is a real answer, not a malformed one. `DELETE` uses it:
  // there is nothing meaningful to say about a thing that no longer exists.
  // Parsing it as JSON would fail on an empty string and report a contract
  // violation for a correct response, so the schema is given `undefined` and
  // callers declare that with `z.undefined()`.
  const hasNoBody =
    response.status === 204 || response.headers.get("content-length") === "0";

  let payload: unknown;
  if (hasNoBody) {
    payload = undefined;
  } else {
    try {
      payload = await response.json();
    } catch (cause) {
      throw ApiError.contract(url, "the body was not valid JSON.", cause);
    }
  }

  // The contract check. A failure here means the backend changed shape — the
  // error names the offending fields so the drift is obvious from the message
  // alone, rather than showing up as `undefined` deep inside a component.
  const result = schema.safeParse(payload);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"} (${issue.message})`)
      .join(", ");

    throw ApiError.contract(url, fields, result.error);
  }

  return result.data;
}

/**
 * Fetches a file rather than a document.
 *
 * The one response in the product that is not JSON: the memoir as a PDF. It
 * needs the same base URL, the same timeout and the same error normalisation as
 * everything else, and it is here rather than in a feature because this module
 * is the only one that calls `fetch` — a rule worth keeping for one exception
 * more than for none.
 *
 * There is no schema to validate against, which is the honest reason this is a
 * second function instead of a flag on the first: `apiRequest` guarantees that
 * nothing unvalidated enters the app, and bytes on their way to a download are
 * outside that promise rather than an exemption from it.
 *
 * Returns the blob and the filename the server asked for, so the caller can
 * hand the browser a name a family will recognise.
 */
export async function apiDownload({
  path,
  headers,
  signal,
}: {
  path: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; filename: string | null }> {
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;

  const timeout = AbortSignal.timeout(env.NEXT_PUBLIC_API_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([timeout, signal]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: combinedSignal,
      cache: "no-store",
      headers: { Accept: "application/pdf", ...headers },
    });
  } catch (cause) {
    unstable_rethrow(cause);
    throw ApiError.network(url, cause);
  }

  if (!response.ok) {
    throw ApiError.http(url, response.status, await readErrorDetail(response));
  }

  // `attachment; filename="Eleanor Marsh.pdf"` — the quotes are optional in
  // the header and the fallback is the caller's problem, not this module's.
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);

  return {
    blob: await response.blob(),
    filename: match ? decodeURIComponent(match[1]) : null,
  };
}
