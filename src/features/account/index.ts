/**
 * The feature's public surface, client-safe.
 *
 * No sibling `server.ts`: `GET /me` needs a token held in the browser, so
 * there is no server data path to expose.
 */

export { accountKeys, useActiveMemoir, useMe } from "@/features/account/hooks";
export {
  accountOverviewSchema,
  memoirSummarySchema,
} from "@/features/account/schemas";
export type {
  AccountOverview,
  MemoirSummary,
} from "@/features/account/schemas";
