# features/contributors

The owner's view of who is in the memoir, and the link that let them in.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `contributorsOverviewSchema`, `shareLinkSchema` |
| `api.ts` | `listContributors`, `reissueLink` |
| `hooks.ts` | `useContributors`, `useReissueLink` |
| `components/ContributorsScreen.tsx` | `/contributors` |

## Three states per person

The middle one is the reason this screen exists:

| State | Shown as |
| --- | --- |
| Has contributed | "3 memories" |
| Opened the link, added nothing | "Opened, nothing yet" |
| Never opened it | "Has not opened the link" |

Somebody who opened the link and wrote nothing is a person to ring, not a
number to chase. There are deliberately no reminder counts, chase-up badges, or
nudge buttons — this is the page most tempted by gamification, which the
product forbids.

## Reissuing the link

`useReissueLink` revokes the current link and issues a new one in a single
backend transaction. It is **irreversible**: everyone holding the old URL loses
access immediately, including people who meant to contribute later. Nothing
already contributed is affected. `ContributorsScreen` says all of that before
the call is made.

It invalidates `accountKeys` as well as its own cache, because `GET /me`
carries `link_token` and the archive's invite banner reads it from there.

## What is deliberately absent

`contributor_token` — a contributor's own credential for adding memories. The
backend does not send it and this schema does not ask for it. An owner holding
it could only use it to impersonate them.
