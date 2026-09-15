# features/memoir

The finished book, as the family reads it. The twin of the backend's
`src/domain/chapters/`.

| File                           | What it holds                                                          |
| ------------------------------ | ---------------------------------------------------------------------- |
| `schemas.ts`                   | `chapterSchema`, `memoirReadingSchema`, `readerSessionSchema`          |
| `api.ts`                       | `openMemoir`, `getReading`, `getChapter`, `listThreads`, `postComment` |
| `readerSession.ts`             | The session cookie, and which memoir a link opened                     |
| `components/MemoirGate.tsx`    | The door: passphrase, name, relation                                   |
| `queries.ts`                   | **Server** data path — the prose, fetched before the page is sent      |
| `hooks.ts`                     | **Client** data path — the comment layer, and the owner's preview      |
| `utils.ts`                     | Roman numerals, credit lines, and `segment()`                          |
| `useLanes.ts`                  | Positions the two right-hand lanes against their paragraphs            |
| `reader.module.css`            | The four-column geometry. Lengths only — no colour                     |
| `components/ReaderFrame.tsx`   | Masthead, contents rail, the frame                                     |
| `components/ChapterReader.tsx` | One chapter: prose, margin, comments                                   |
| `components/BookMatter.tsx`    | `TitlePage`, `PeoplePage`, `ColophonPage` (server components)          |
| `components/PageEditor.tsx`    | The same page, editable — the owner's own corrections                  |

## A book has pages, and the matter is three of them

The reader walks in one direction: title page, the chapters in order, the
people, the colophon. Each is a page with its own address, its own entry in the
contents rail, and its own place in what the turn buttons do — so the last
chapter turns into the people rather than into a dead end.

It was one page until it wasn't. The title page carried the contents, the index
of people and the colophon stacked down it, and the rail's "Back matter"
pointed at `/m/{token}#people` — an anchor halfway down the _front_ matter. A
book whose every chapter is a page had a first page four pages long, and the
colophon appeared in no contents at all.

The chapters and the two matter pages share one route, `/m/[token]/[page]`,
because they need the same session, the same covers and the same frame and
differ only in what fills the column. `people` and `colophon` cannot collide
with a chapter: a chapter id is a UUID.

## Two credentials, one book

`base` is the book's address without a page, and every link in the feature is
built from it — `/m/{token}` for the family, `/preview/{memoirId}` for the owner
reading before they seal it.

The preview exists because **sealing cannot be taken back** and a view link is
what publication creates. `BookPanel` said "read it through before sealing it"
while offering no way to: the only way to see the book was to publish it to the
family first. The backend had been ready all along —
`GET /memoirs/{id}/chapters` exists for exactly this, and the chapter route
tries the owner's credential before any link so an unpublished chapter is
readable by the person whose it is.

It is the one screen here fetched in the **browser**, and not by preference:
the owner's credential is a Supabase session in `localStorage`, which a server
render cannot see. The family's copy stays server-rendered, because a cookie
does reach the server.

**The preview has no comment layer.** Not a simplification — a comment is left
by somebody holding the link, against a passage that can never move afterwards,
and before sealing neither of those exists. `ChapterReader` takes a null token,
`useThreads` uses `skipToken` rather than asking through a link that isn't
there, and the chapter closes by saying the margins open when the memoir is
sealed.

## The page is edited by hand, and only by hand

`PageEditor` is the preview's other half: one toggle in the top bar swaps the
finished page for the same page with controls on it. Reword a passage, reorder
the page, remove something, rename the chapter, move a photograph to another
paragraph or another placement. `PATCH /chapters/{id}`, owner bearer only,
refused once the memoir is sealed.

**Nothing rewrites itself.** The two automatic actions in the product — plan,
and assemble — are both pressed deliberately, in the archive. There is no
"improve this paragraph" button here and there should not be: the owner is the
only party who can tell whether a sentence is true to what their family meant.

**There is no "add a passage" either**, and that one is a rule rather than a
gap. A paragraph carries `block_source` — which memory it came from and who
left it — and prose typed into this screen would have nobody behind it, which
is precisely what the never-fabricate rule forbids. Moving a passage to a
different chapter is likewise absent: that is the outline's decision, and the
outline stays editable until sealing.

**Editing words moves offsets, so the backend re-finds every span.** The credit
follows the phrase it was given for; where the phrase is gone, the name comes
to rest on the whole passage. The editor says so above the first field, because
an owner about to rewrite a sentence should know what it costs the margin.

It is not `contenteditable` over the reader. The reader positions credits,
plates and comment cards by character offset against a measured column, and a
caret inside that is a layout pass fighting a text cursor.

## Who this is for

Somebody with **no account**, holding a view link. That is why the whole
feature is addressed by a token rather than a session, why `queries.ts` exists
at all (like `features/invitation`, and unlike everything else), and why
`/m/[token]` sits outside the `(app)` route group with its own chrome. Signed-in
navigation would be four dead ends.

## The door

A view link is made to be forwarded, and every forward is a copy of the whole
book — so the link is half a credential now. The other half is a passphrase the
owner set at publication, and `POST /r/{token}/open` exchanges the two for a
**reader session** that also says who is holding it.

Three consequences run through this feature:

- **The session is a cookie**, not `localStorage`. `/m/[token]` is server-
  rendered so the prose arrives in the first response, and a server render
  cannot see `localStorage`. `readerSession.ts` is the whole mechanism.
- **Nobody reads anonymously.** The name is taken once, at the door, so
  `commentCreateSchema` carries none and `CommentComposer` states whose a
  reflection will be rather than asking again. Before this, a person could read
  a whole family's memoir as nobody at all and be asked who they were only if
  they had something to say.
- **The owner is not asked anything.** `MemoirGate` tries their Supabase
  session silently before showing a form; the backend recognises them and lets
  them in as their own owner participant, which is what keeps `is_owner`
  honest on their comments.

Every way of failing answers 404 — an unknown link, a revoked one, the wrong
passphrase — and the gate repeats one sentence for all of them. Saying "that
link is real but your passphrase is wrong" is what turns a forwarded link into
something worth guessing at.

It is also the only screen in the product wider than one column, which the
`(app)` shell's centred `max-w-7xl` could not have held.

## A chapter is assembled, not written

This is the fact the whole design serves. Chapters are drafted from many
people's memories and rephrased, so a reader must always be able to ask of any
sentence _who actually said this_ — the product's "never fabricate" rule is
unenforceable if the answer is not on the page.

So `block_source` carries character offsets into the paragraph, and three
things follow:

- **The prose carries no marks.** No superscripts, no brackets. It reads as a
  printed page.
- **A numeral in the left gutter** is the citation key _and_ the durable deep
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

| Lane         | Holds                               | Sealed?               |
| ------------ | ----------------------------------- | --------------------- |
| Inner margin | Photographs, voice credits, sources | Yes — with the memoir |
| Comment lane | The conversation                    | No. It grows forever  |

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
  when nobody asked, so it means _unstated_. `relationshipLabel()` returns null
  for it and the name stands alone.
- **Hiding whether the memoir is sealed.** An unpublished memoir says so in the
  masthead and again in the colophon. Letting a family read a draft believing
  it was finished is the worse failure.
