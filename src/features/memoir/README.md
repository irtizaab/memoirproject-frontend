# features/memoir

The finished book, as the family reads it. The twin of the backend's
`src/domain/chapters/`.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `chapterSchema`, `memoirReadingSchema`, `commentCreateSchema` |
| `api.ts` | `getReading`, `getChapter`, `listThreads`, `postComment` |
| `queries.ts` | **Server** data path — the prose, fetched before the page is sent |
| `hooks.ts` | **Client** data path — the comment layer, and only that |
| `utils.ts` | Roman numerals, credit lines, and `segment()` |
| `useLanes.ts` | Positions the two right-hand lanes against their paragraphs |
| `reader.module.css` | The four-column geometry. Lengths only — no colour |
| `components/ReaderFrame.tsx` | Masthead, contents rail, the frame |
| `components/ChapterReader.tsx` | One chapter: prose, margin, comments |
| `components/BookCover.tsx` | Front and back matter (server component) |

## Who this is for

Somebody with **no account**, holding a view link. That is why the whole
feature is addressed by a token rather than a session, why `queries.ts` exists
at all (like `features/invitation`, and unlike everything else), and why
`/m/[token]` sits outside the `(app)` route group with its own chrome. Signed-in
navigation would be four dead ends.

It is also the only screen in the product wider than one column, which the
`(app)` shell's centred `max-w-5xl` could not have held.

## A chapter is assembled, not written

This is the fact the whole design serves. Chapters are drafted from many
people's memories and rephrased, so a reader must always be able to ask of any
sentence *who actually said this* — the product's "never fabricate" rule is
unenforceable if the answer is not on the page.

So `block_source` carries character offsets into the paragraph, and three
things follow:

- **The prose carries no marks.** No superscripts, no brackets. It reads as a
  printed page.
- **A numeral in the left gutter** is the citation key *and* the durable deep
  link. One mark doing two jobs, and it survives into print, which a
  hover-only treatment would not.
- **Attribution is reciprocal.** Hovering a credit underlines the exact clause
  it fathered; hovering the clause lifts the credit.

`segment()` in `utils.ts` is what makes this possible, and it is the most
tested function in the feature. It sweeps the boundaries of every anchor rather
than nesting spans, because sources and comment threads **overlap freely** — a
comment can be left on half of a sentence one person supplied — and nesting
would have to pick a winner.

## Two right-hand lanes, because they have different lifespans

| Lane | Holds | Sealed? |
| --- | --- | --- |
| Inner margin | Photographs, voice credits, sources | Yes — with the memoir |
| Comment lane | The conversation | No. It grows forever |

Keeping them apart is not decoration. Forty comments accumulating over ten
years must never push a photograph away from the paragraph that earned it, and
one shared lane guarantees that they would.

`useLanes` lays each out separately for that reason, and folds them into one
pass below 1240px where there is no longer room for two. Below 1000px it does
**nothing at all** — the stylesheet has already dropped every lane item into
the flow at its anchor. That is the payoff for anchoring rather than running a
feed down the side: the phone layout falls out of the desktop one instead of
being a second design.

## The rule the layout exists to keep

`.frame` is a **fixed** total width and `.page` is offset from its left edge by
a constant. Collapsing the contents rail therefore cannot move the prose one
pixel — the freed space becomes gutter, never measure. A reader who hides the
contents mid-sentence keeps their line. Anything that makes the column a
fraction of the frame breaks this and will not be obvious in a screenshot.

## Anchors are safe here, and only here

Both a source and a comment point at a range of characters inside a paragraph.
In an editable document that is the hardest problem in the building. It is safe
here because **a published memoir is immutable** — the text can never move out
from under an offset. No rebasing, no orphaned comments.

That is a real dependency, not a happy accident. If anything ever makes a
published chapter editable, `segment()`, `block_source` and `comment_thread`
all need rewriting.

## The participant token is borrowed, on purpose

`useLeaveComment` stores the token through `useRememberContributor` from
**`features/invitation`**, which keys it on the memoir. That is the only reason
this feature depends on that one.

The alternative was a second storage key here, and it would have been the exact
bug `invitation/contributorStorage.ts` was written to fix: somebody who sent
memories months ago and comments today appearing in one memoir as two people.

## Things that would be product bugs

- **A progress indicator anywhere.** The colophon's four numbers are facts
  about what the book is made of and have no denominator. A memoir with no
  chapters yet gets one quiet line, not "0% complete".
- **Rendering `never_forget`.** It is the owner's private answer; the backend
  filters it out of every link-addressed response and nothing here should go
  looking for it.
- **Printing `relationship` raw.** `other` is the default a contributor gets
  when nobody asked, so it means *unstated*. `relationshipLabel()` returns null
  for it and the name stands alone.
- **Hiding whether the memoir is sealed.** An unpublished memoir says so in the
  masthead and again in the colophon. Letting a family read a draft believing
  it was finished is the worse failure.
