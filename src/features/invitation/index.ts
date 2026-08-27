/**
 * The feature's public surface, client-safe.
 *
 * Deliberately not exported: `api.ts`. Callers pick a data path, and the
 * server path already routes through it.
 */

export { InvitationCard } from "@/features/invitation/components/InvitationCard";
export type { Invitation } from "@/features/invitation/schemas";
