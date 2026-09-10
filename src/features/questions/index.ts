/**
 * The feature's public surface, client-safe.
 *
 * `api.ts` is deliberately not exported: every call needs the owner's bearer
 * token, and the hooks are the one path that attaches it.
 */

export { QuestionsScreen } from "@/features/questions/components/QuestionsScreen";
export {
  questionKeys,
  useDeleteQuestion,
  useGenerateLibrary,
  useQuestionLibrary,
  useSetQuestionsMode,
  useUpdateQuestion,
} from "@/features/questions/hooks";
export {
  GROUP_LABELS,
  GROUP_ORDER,
  type Question,
  type QuestionLibrary,
  type QuestionsMode,
  type RelationshipGroup,
} from "@/features/questions/schemas";
