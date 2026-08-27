/**
 * The feature's public surface, server-only.
 *
 * Kept apart from `index.ts` so the `server-only` guard in `queries.ts` can do
 * its job: a client component that reaches for this file fails at build time
 * rather than leaking server code into the browser bundle.
 */

import "server-only";

export { fetchInvitation } from "@/features/invitation/queries";
