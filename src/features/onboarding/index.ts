/**
 * The feature's public surface, client-safe.
 *
 * There is no sibling `server.ts`: onboarding has no server data path. Before
 * signup the only credential is a token in the browser's localStorage, so
 * nothing here can be fetched during server rendering.
 *
 * Deliberately not exported: `api.ts` and `draftStorage.ts`. Callers go
 * through the hooks, which is what keeps cache keys and the "forget the draft
 * once it is claimed" rule in one place.
 */

export { OnboardingFlow } from "@/features/onboarding/components/OnboardingFlow";
export {
  onboardingKeys,
  toDraftUpdate,
  useMe,
  useOnboardingDraft,
} from "@/features/onboarding/hooks";
export type {
  AccountOverview,
  Draft,
  DraftCreated,
  DraftUpdate,
  MemoirSummary,
  RelationshipGroup,
  SignupFormValues,
} from "@/features/onboarding/schemas";
