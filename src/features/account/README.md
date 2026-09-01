# features/account

The signed-in user and the memoirs they own. One endpoint, `GET /me`.

Its own feature rather than part of `onboarding/` because every signed-in
screen reads it. Onboarding is where an account is *created*; the archive, the
contributors list and the billing page all read it long afterwards, and none of
them should import from a flow their user finished weeks ago.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `memoirSummarySchema`, `accountOverviewSchema` |
| `api.ts` | `getMe()` |
| `hooks.ts` | `accountKeys`, `useMe()`, `useActiveMemoir()` |

## useActiveMemoir()

**The single place a screen decides which memoir it is about.** The backend
returns memoirs newest first and the product supports exactly one per account
today, so "the first one" is the whole selection rule. When a second memoir
becomes possible, a switcher hooks in here — not into four pages each picking
`memoirs[0]` for themselves.

## No server data path

`GET /me` is authenticated with a Supabase token held in the browser's
localStorage, so it cannot be fetched during server rendering. That is why
there is no `queries.ts` or `server.ts`.

## Note for onboarding

`features/onboarding/schemas.ts` re-exports `memoirSummarySchema` from here,
because `claimDraft()` returns one. Its claim mutation also seeds
`accountKeys.me()` directly from the claim response, so the archive renders
without a second round trip.
