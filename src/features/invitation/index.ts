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
  useContributorQuestions,
  useContributorToken,
  useRememberContributor,
  useRememberContributorFor,
  useMyContributions,
  useSubmitContribution,
} from "@/features/invitation/hooks";
export type {
  ContributedMemory,
  Contribution,
  ContributorQuestions,
  Invitation,
  RelationshipGroup,
} from "@/features/invitation/schemas";
