/**
 * The feature's public surface, client-safe.
 *
 * Deliberately not exported: `api.ts` and `contributorStorage.ts`. Callers pick
 * a data path — `server.ts` for resolving the invitation, the hooks for
 * contributing — which keeps the participant-token rule in one place.
 */

export { ContributeForm } from "@/features/invitation/components/ContributeForm";
export { InvitationCard } from "@/features/invitation/components/InvitationCard";
export {
  invitationKeys,
  useContributorToken,
  useRememberContributor,
  useMyContributions,
  useSubmitContribution,
} from "@/features/invitation/hooks";
export type {
  ContributedMemory,
  Contribution,
  Invitation,
} from "@/features/invitation/schemas";
