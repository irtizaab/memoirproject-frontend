/**
 * Environment configuration — the frontend twin of the backend's `src/core/`.
 *
 * Environment variables are external data, so they get validated like any other
 * external data. Parsing happens at module load: if a variable is missing or
 * malformed, the app fails immediately with a readable message instead of
 * surfacing later as a mystery 404 or `undefined` in a URL.
 */

import { z } from "zod";

const envSchema = z.object({
  /** Base URL of the FastAPI backend, with no trailing slash. */
  NEXT_PUBLIC_API_BASE_URL: z
    .url("must be a valid URL, e.g. http://localhost:8000")
    .transform((url) => url.replace(/\/+$/, "")),

  /** How long a single API request may take before it is aborted. */
  NEXT_PUBLIC_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),

  /**
   * Supabase project URL, e.g. https://abcdefgh.supabase.co
   *
   * The browser talks to Supabase Auth directly for signup and login; the
   * FastAPI backend only ever *verifies* the resulting token. That split is
   * why this belongs here rather than behind the API.
   */
  NEXT_PUBLIC_SUPABASE_URL: z
    .url("must be a valid URL, e.g. https://abcdefgh.supabase.co")
    .transform((url) => url.replace(/\/+$/, "")),

  /**
   * Supabase anon (publishable) key.
   *
   * Public by design — it identifies the project, it does not grant access.
   * Every Supabase frontend ships it in the bundle. The keys that *do* grant
   * access (service role, database password) live only on the backend.
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "is required — Supabase → Project Settings → API"),
});

/**
 * Each variable is read as a literal `process.env.X` member access.
 *
 * This is not stylistic. Next.js inlines `NEXT_PUBLIC_*` variables into the
 * client bundle by statically replacing exactly this expression at build time.
 * Passing `process.env` wholesale to `.parse()` would work on the server and
 * silently produce `undefined` in the browser.
 */
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_TIMEOUT_MS: process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${details}\n\n` +
      `Copy .env.example to .env.local and fill in the missing values.`,
  );
}

export const env = parsed.data;
