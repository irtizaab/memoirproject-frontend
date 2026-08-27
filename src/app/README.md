# src/app

The frontend twin of the backend's `src/api/`. Routes live here, and like FastAPI routers they stay
**thin**: fetch through a feature, compose that feature's components, and nothing else.

A page with a `fetch` call, a URL, or business logic in it belongs in `src/features/` instead.

## Files

| File | Purpose |
| --- | --- |
| `layout.tsx` | Root layout. A server component — keep it that way. |
| `providers.tsx` | The single `"use client"` boundary at the root: query client + devtools. |
| `error.tsx` | Route-level error boundary. Catches server-path failures. |
| `page.tsx` | `/` — redirects to `/archive`. There is no landing page yet. |
| `(app)/layout.tsx` | Chrome for every signed-in screen: header, centred column, footer, session guard. |
| `<route>/page.tsx` | One folder per route. See `example/`. |

## Route groups

`(app)` is a **route group** — parenthesised, so it adds a layout without adding a URL segment.
`src/app/(app)/archive/page.tsx` serves `/archive`, not `/app/archive`.

Two routes sit outside it on purpose:

| Route | Why it has no app chrome |
| --- | --- |
| `/onboarding` | Reached before an account exists, so there is nowhere to navigate to. |
| `/j/[token]` | A contributor. They have no account and never will, so the signed-in nav would be a set of dead ends. |

## Server and client components

Files here are **server components by default**. That is the behaviour you want: data is fetched
during render and arrives as HTML, with no loading state and no client round trip.

Add `"use client"` only to components that need browser-only features — state, effects, event
handlers, browser APIs. Push the directive as far down the tree as you can. `layout.tsx` stays a
server component precisely because `providers.tsx` carries the directive instead.

## Conventions

- Fetch server-path data via the feature's `server.ts`; import everything else from its `index.ts`.
- Add a nested `error.tsx` when a section should be able to fail without taking the route with it.
- Add `loading.tsx` next to a page to stream a fallback while its data resolves.
- `params` and `searchParams` are **async** in Next.js 16 — `await` them before use.
