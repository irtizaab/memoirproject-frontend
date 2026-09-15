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
| `(app)/layout.tsx` | Chrome for every signed-in screen: header, footer, session guard. **Not** a centred column — see below. |
| `<route>/page.tsx` | One folder per route. See `example/`. |

## Route groups

`(app)` is a **route group** — parenthesised, so it adds a layout without adding a URL segment.
`src/app/(app)/archive/page.tsx` serves `/archive`, not `/app/archive`.

Three routes sit outside it on purpose:

| Route | Why it has no app chrome |
| --- | --- |
| `/onboarding` | Reached before an account exists, so there is nowhere to navigate to. |
| `/j/[token]` | A contributor. They have no account and never will, so the signed-in nav would be a set of dead ends. |
| `/m/[token]` | A reader of the finished memoir. Same reason — and it is also the only screen wider than one column, which the app's `max-w-7xl` measure could not hold. |
| `/m/[token]/search` | The same reader, searching. Server-rendered as far as the door; the results themselves change as somebody types, so they are a client component. |

`/search` inside `(app)` is its twin: the same screen, the same corpus, the
owner's credential instead of the reader's. Two routes over one feature,
because the family and the owner ask the same question and must get the same
answer.

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

## Bands, not a centred column

`(app)/layout.tsx` renders `main` at full width. Screens centre themselves with
`PageHeader` and `PageBody` from `src/components/layout/`.

That is the whole visual structure of the product: a page is bands at different
weights — a `--paper-deep` title band with a rule under it, then the ordinary
page — rather than sections at one weight separated by air. A band has to run
edge to edge, and it cannot if the layout has already wrapped a centred column
round it.

The practical rule: a page here composes a feature component, and that feature
component opens with `<PageHeader>` and puts its content in `<PageBody>`. Do not
add padding or a `max-w-*` back into the layout.
