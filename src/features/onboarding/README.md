# features/onboarding

The Memoir Project's onboarding flow: pledge → name → relationship → years → deep question →
signup → pricing → payment → **`/archive`**.

Ported from the `memoir-onboarding_7.html` prototype, preserving its visual design (serif/ivory
look, Spectral + Inter) and behaviour as closely as React allows.

## Where it ends

At the archive, which is the actual product. Everything in this feature is connected to the real
backend; nothing in it is a mockup any more.

It used to run five screens further — a dashboard, an "AI is drafting your chapters" spinner, a
chapter review, a publish confirmation, and a published page. All five were built before the
signed-in app existed and none of them did anything: the spinner was a `setInterval` over an array
of strings, the six chapters were hardcoded, and the published link was invented
(`memoirproject.co/m/<name>-9f2c`). Meanwhile `/archive`, `/contributors` and `/billing` were real
and reachable by nothing. They were deleted; the design is in commit `f11ddbc` if the AI-chapters
feature is ever built for real.

| Screen | What it does |
| --- | --- |
| `landing` | `POST /drafts` on pledge, creating the anonymous draft. Not on page load, so a visitor who never starts leaves no row behind. |
| `name` / `rel` / `years` / `deep` | `PATCH /drafts/{id}` per step, best-effort and not awaited. |
| `signup` | Supabase Auth signup/sign-in, then `POST /memoirs/claim`. Awaited — the flow does not advance until the memoir exists. |
| `pricing` | `GET /plans`. The prices are the database's, not this repo's — see below. |
| `pay` | A card-form placeholder (no processor is wired up). `PATCH /billing/plan` records the chosen term, then `router.push("/archive")`. |

### Prices come from the API

`pricing` and `pay` both read `GET /plans` through `features/billing`. They used to read a `PLANS`
constant in `data.ts` quoting $3/month while the `plan` table said $8 — two hardcoded lists with no
reason to agree, and they did not. There is now one source, and `/billing` reads the same rows.

`PATCH /billing/plan` at the end of `pay` is an **entitlement** change, not a charge: nothing is
taken, `payments_enabled` stays false, and no renewal date is invented. Without it, someone who
picks yearly would be told they are on the monthly plan the moment they opened `/billing`.

### Why `router.push` and not `window.location`

`claim()`'s `onSuccess` seeds the new memoir into the `accountKeys.me()` cache. A client navigation
keeps that cache, so `/archive` mounts already holding the subject's name and years — no spinner,
no second round trip. A full page load would throw it away and refetch.

### The landing guard

If a session already has a memoir, `landing` redirects to `/archive`. Pressing Back from the
archive lands here, and a second run through would create a *second* memoir — which
`useActiveMemoir` would then treat as the active one, since it takes `memoirs[0]` and the backend
returns them newest first. Their real archive would appear to have emptied itself.

The guard is on `landing` only. `pricing` and `pay` run with both a session and a memoir by design.

## No server data path

There is no `queries.ts` / `server.ts`: before signup the only credential is the draft token in
the browser's localStorage, so nothing here can be fetched during server rendering. Contrast
`features/invitation/`, which is server-rendered precisely because `GET /j/{token}` needs no auth.

### The two credentials

They are not interchangeable, and `POST /memoirs/claim` needs both:

- `X-Draft-Token` proves *this browser* started the draft. Before signup it is the only credential
  that exists.
- `Authorization: Bearer` proves *who the user is*, once Supabase has issued a token.

Without the draft token, any signed-in user who learned a draft id could claim someone else's
answers.

### Why answers are re-sent at signup

The per-step saves are fired, not awaited, so a slow request never makes the next question feel
sluggish. That means one can be lost. `claim()` therefore `PATCH`es the complete answer set
immediately before claiming, so the row is correct regardless of which intermediate saves landed.

### The years wheel

Three UI facts collapse into two columns, which is why `subject_is_living` is nullable:

| The user did | `subject_is_living` | `through_year` |
| --- | --- | --- |
| picked "Present" | `true` | `null` |
| picked a year | `false` | that year |
| never touched it | `null` | `null` |

"We didn't ask" and "no, they have died" are different answers. Defaulting the first to `false`
would record something the user never said.

## Files

| File | Purpose |
| --- | --- |
| `schemas.ts` | Zod contract — the twin of the backend's `draft_models.py` and `memoir_models.py`. |
| `api.ts` | The four endpoint calls. The only file that knows the paths. |
| `hooks.ts` | TanStack Query mutations and `toDraftUpdate()` (UI state → column names). |
| `draftStorage.ts` | The draft id/token in localStorage, exposed as a React external store. |
| `types.ts` | `Step` union, `PlanTerm`, and the `OnboardingState` carried across the flow. |
| `data.ts` | Static content: relationship chips, the features list, background photos. **Not prices.** |
| `utils.ts` | Pure string helpers (`firstName`, `possessive`). |
| `onboarding.module.css` | The prototype's stylesheet, scoped to `.shell` instead of `:root`/`body`. |
| `components/OnboardingFlow.tsx` | The orchestrator — owns `step` and `OnboardingState`, renders the active step. |
| `components/*Step.tsx` | One component per screen. |
| `components/BackgroundLayer.tsx` | The crossfading full-bleed background photo behind each step. |
| `components/BookCover.tsx` | The generated book-cover mockup shown at signup and pricing. |
| `components/YearWheel.tsx` | The scroll-snap year picker used by `YearsStep`. |

## The Google handoff

`signInWithGoogle` navigates away from the site, so the browser comes back to a **fresh page
load**: `OnboardingFlow` remounts at `step: "landing"` with `INITIAL_STATE` and every answer gone.
Worse than losing the answers, nothing then called `claim()` — its only call site was the password
form's submit handler — so a Google user ended up signed in, with an unclaimed draft, looking at an
archive that said no memoir had been created. The password path never had the problem because it
never leaves the page.

Three pieces carry the state across:

1. `SignupStep` calls `storeAnswers(state)` in the instant before the redirect.
2. `OnboardingFlow` subscribes to `onAuthStateChange` — not `useSupabaseSession` — because the
   session does not exist when it mounts; `detectSessionInUrl` has to exchange Google's code
   first, and that callback is when it has. On a session, it calls `takeAnswers()`.
3. `takeAnswers()` returns non-null **only** on the return leg: the answers are written just
   before the redirect and cleared the moment they are read. That one-shot read is the signal.
   An ordinary visit, a token refresh, and a second render all get `null`.

On a hit, the flow restores the answers and jumps straight to `signup` with `autoClaim`, which
runs the claim on mount and renders progress, the error, and a retry in place of the form — asking
a signed-in user for an email and password would be asking for something already given.

## Notes

- `public/Images/` holds the background photos, referenced by path in `data.ts`
  (`STEP_BACKGROUND`). The `signup` step has no matching photo in that folder, so it renders with
  no background — same fallback the original prototype used for a missing key.
- The palette, the two typefaces and `--step` are declared in `app/globals.css`, not here. This
  file is layout and behaviour only; see the note at the top of it.
- CSS rules belonging to the five deleted screens (`.chap*`, `.work*`, `.person*`, `.stat*`,
  `.warn`, `.linkbox`, `.dash-*`, `.jump`, `.btn-quiet`) went with them, along with the prototype's
  `.mode`/`.plate*`/`.does`/`.keep` rules that were dead on arrival.
