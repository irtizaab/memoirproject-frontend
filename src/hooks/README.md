# src/hooks

React hooks shared across features. **Nothing here knows about your domain**, and nothing here fetches
data.

It has no backend twin — it exists because React has a unit of reuse that Python does not. Add a hook
the first time a **second** caller needs it; until then it lives in the feature that uses it.

## What is here

| Hook | What it does |
| --- | --- |
| `useSupabaseSession.ts` | Tracks the signed-in Supabase session and keeps tracking it, so a sign-out in another tab logs this one out too. |

It qualifies despite the "no data fetching" rule below: the session is browser state the Supabase
SDK already holds in localStorage, not something fetched from our API. Its two callers are
`AppHeader` and `RequireSession`.

## What belongs here

Generic, reusable behaviour tied to the browser or to React's lifecycle:

- `useDebouncedValue.ts` — delay a value until typing stops
- `useMediaQuery.ts` — track a breakpoint in JS
- `useLocalStorage.ts` — read and write a persisted value
- `useMounted.ts` — guard against hydration mismatches
- `useCopyToClipboard.ts`, `useInterval.ts`, `useOnClickOutside.ts`

The shadcn CLI also targets this directory (`components.json` maps the `@/hooks` alias here), so a
primitive you add may drop a hook in.

## Conventions

- **One hook per file, named exactly after the hook** — `useDebouncedValue.ts` exports
  `useDebouncedValue`.
- **Start every file with `"use client"`.** These hooks use state, effects, or browser APIs, so they can
  only run in a client component. The directive on the hook means a consumer cannot import it into a
  server component by accident.
- **Colocate the test:** `useDebouncedValue.ts` and `useDebouncedValue.test.ts`, using
  `renderHook` from `@testing-library/react`.
- **Return a tuple or an object, not both across the codebase.** Pick the shape that reads best at the
  call site and stay consistent within a hook's lifetime.

## What does not belong here

| Not this | It goes in |
| --- | --- |
| Data fetching, TanStack Query hooks, cache keys | `features/<name>/hooks.ts` |
| A hook only one feature uses | `features/<name>/hooks.ts` |
| A hook whose props or return value name a domain concept | `features/<name>/hooks.ts` |
| A pure function with no React in it | `src/utils/` |
| A provider every route needs | `src/app/providers.tsx` |

The distinction that matters: **`features/<name>/hooks.ts` is the feature's client *data path*** — it
calls the feature's `api.ts` and owns its cache keys. This directory is generic React plumbing that
never touches the network. A hook here should not import from `@/features/` or `@/lib/api/` at all.
