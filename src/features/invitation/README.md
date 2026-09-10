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

### The questions above the form

Once somebody has contributed once, `useContributorQuestions` fetches the four
or five questions written for people in their relationship group and the form
shows them above the composer — things to write *about*, not a field each.
There is still one box. Somebody can answer one of them, four, or none.

They come from `GET /j/{token}/questions`, which takes both credentials for the
same reason `listMyContributions` does: the link says which memoir, the
participant token says which person, and therefore which group.

Nothing renders before the first contribution, because until then there is no
participant token and nobody to write questions for. That is the honest state,
not a gap — the invitation card and the form are enough to start with.

The owner decides what is in the library, on `/questions`. See
`features/questions/README.md`; this feature only reads it.

**What the backend refuses to send here, and this feature therefore never
holds:** no ids for rows a contributor cannot edit, no `source` saying which
questions a model drafted, no mode, and above all not `subject_notes` — the
owner's own words about the person, written to produce questions and not to be
read by whoever the link was forwarded to. `ContributorQuestions` on the
backend is where that line is held; `questionsSchema` here is the second half.

No numbering, no "answered" state, no count of what is left. A ticked-off list
of questions is the progress bar the product forbids.

### Asking how somebody knew them

The chips beside the name field send `relationship`, reusing `RELATIONS` from
`features/onboarding` verbatim — the mapping is the same in both directions, and
a second copy is a second place for the enum to drift. "Someone else" is
appended because this audience is wider than onboarding's: the link reaches
cousins, colleagues and neighbours, and making them pick the closest of four
wrong answers would put them in a group whose questions are not for them.

Two things read the answer. The reader prints it under their name in a credit
line, and the question library picks what they are asked from it. Until this
existed, `resolve_participant` wrote `'other'` for everybody, hardcoded.

It is **optional and says so**. Somebody who does not want to categorise their
relationship to a person they have lost should not have to in order to leave a
memory. Omitting it sends nothing rather than `other`, so the backend leaves
whatever they said last time alone instead of overwriting it.
