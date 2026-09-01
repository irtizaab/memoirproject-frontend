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


---

## Contributing (added with the memories slice)

The page is no longer read-only. `ContributeForm` lets someone with no account
leave a voice note, a photograph, or writing.

| File | What it holds |
| --- | --- |
| `hooks.ts` | `useContributorToken`, `useSubmitContribution`, `useMyContributions` |
| `contributorStorage.ts` | The participant token, as a React external store |
| `components/ContributeForm.tsx` | The submit flow |

### How a person with no account is remembered

The hardest constraint in the product — "contributors never create accounts" —
met with the smallest mechanism that works:

1. First submission carries a `display_name` and no token.
2. The backend creates the `memoir_participant` row and returns a
   `participant_token`.
3. `contributorStorage.ts` keeps it in localStorage, keyed **per link**.
4. Every later submission sends it back, so the same person adds a second
   memory rather than appearing in the archive twice.

A token that does not match is not an error — it is a cleared cookie or a
different phone. The backend falls through to creating a new participant.
Losing a name is recoverable; losing the memory is not.

### The privacy promise is real

`useMyContributions` returns only what this participant added. A contributor
cannot see the archive, cannot see anyone else's memories, and cannot see the
owner's `never_forget` answer — the backend's `response_model` filters that out
of `GET /j/{token}` and this feature's schema does not ask for it. The note
above the form says so, and it is true rather than reassuring.

### Two data paths, on purpose

- **Server** (`queries.ts` → `server.ts`) resolves the invitation. That
  endpoint needs no credential, so the subject's name arrives as HTML.
- **Client** (`hooks.ts`) does everything after. Recording audio is not
  something a server can do.
