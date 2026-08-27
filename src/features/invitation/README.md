# features/invitation

What a contributor sees when they open a share link — `/j/{token}`. The twin of the backend's
`src/api/links.py` and `src/domain/links/link_service.py`.

## Why this is its own feature, not part of `onboarding/`

The actor is different. Onboarding serves the memoir's **owner**, who signs up and holds a session.
This serves a **contributor**, who has no account and — per the product's non-negotiable
constraints — never will. The token in the URL is the entire credential.

The backend draws the same line, keeping `domain/links/` apart from `domain/memoirs/`.

## Why it has a server data path and `onboarding/` does not

`GET /j/{token}` is the only unauthenticated endpoint in the API. There is no browser-held
credential to wait for, so the page is rendered as HTML on the server — the repo's default. The
token is never handled by client-side JavaScript.

## Files

| File | Purpose |
| --- | --- |
| `schemas.ts` | Zod mirror of the backend's `LinkInvitation`. |
| `api.ts` | The single endpoint call. |
| `queries.ts` | Server fetcher. `cache: "no-store"` — the backend counts opens and honours revocation. |
| `server.ts` | Server-only barrel. |
| `index.ts` | Client-safe barrel. |
| `components/InvitationCard.tsx` | The card. A server component — no hooks, no fetching. |

## Notes

- **`never_forget` is deliberately absent** from the schema. It is the owner's private answer, and
  the backend's `response_model` filters it out before replying. This schema not asking for it is
  the second half of that guarantee.
- A 404 means the token is unknown **or revoked** — the backend does not distinguish them, so a
  killed link looks exactly like one that never existed. The page calls `notFound()` for 404 and
  re-throws anything else, so a backend outage surfaces as an error rather than a missing page.
- **The contribute flow itself is not built.** This page exists so a shared link resolves to
  something real, and is the obvious place to build on.
