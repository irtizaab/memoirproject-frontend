/**
 * The SERVER data path.
 *
 * The default path in this codebase, and available here precisely because
 * `GET /j/{token}` needs no authentication — there is no browser-held
 * credential to wait for, so the page can be rendered as HTML server-side.
 * Contrast `features/onboarding/`, which has no `queries.ts` at all: before
 * signup its only credential lives in the browser's localStorage.
 */

import "server-only";

import { getInvitation } from "@/features/invitation/api";
import type { Invitation } from "@/features/invitation/schemas";

/**
 * Fetches the invitation for a share token.
 *
 * `cache: "no-store"` because the backend increments `open_count` on every
 * call and honours revocation. A cached response would under-count opens and,
 * worse, keep serving a link after it had been killed.
 */
export async function fetchInvitation(token: string): Promise<Invitation> {
  return getInvitation(token, { cache: "no-store" });
}
