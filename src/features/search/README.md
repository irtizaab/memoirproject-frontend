# features/search

Finding one afternoon in a life. The twin of the backend's
`src/domain/chapters/search_service.py`.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `searchHitSchema`, `searchResultsSchema` |
| `api.ts` | `searchArchive` (owner) and `searchMemoir` (reader) |
| `hooks.ts` | `useSearch`, `SearchSource`, and the settle-while-typing delay |
| `utils.ts` | `highlight()`, and what each kind of hit is called |
| `components/SearchScreen.tsx` | The whole screen, for both audiences |

## One screen, two doors

The owner reaches this from `/archive` and a family member from inside the
book at `/m/[token]/search`. They search the **same corpus and get the same
results** — that is a product decision, not an implementation shortcut. A
search that quietly returned less to the family than to the owner would have
them wondering what else was being kept from them.

So the difference between them is one type, `SearchSource`, and it stops at
`api.ts`. The screen does not know which one it is showing.

## The excerpt is not HTML

`ts_headline` wraps each match in two control characters rather than `<mark>`,
and `highlight()` splits on them so the component emits its own element. The
reason is the reflections: an excerpt can be built from text a reader typed,
and marking it up server-side would mean rendering user input as markup.

`highlight()` scans rather than splitting on each delimiter, so an unbalanced
pair degrades into plain text instead of losing the rest of the sentence.

## The counts are the results

The filter chips are counted from the same rows the list is drawn from, and
filtering happens here rather than by asking the backend again with a kind. A
chip that says 1 and shows nothing is the kind of thing that makes a family
stop trusting a page, and refetching per filter is how that happens.

## Things that would be product bugs

- **Searching `never_forget`.** It is the owner's private answer, filtered out
  of every response in the API and deliberately not indexed. A search result is
  the one place it could come back.
- **Fetching on every keystroke.** `useSettled` waits 250ms, so a search is one
  request per word rather than one per letter.
- **Blinking to empty between queries.** `placeholderData` keeps the previous
  results on screen while the next ones load; without it a fast search feels
  broken.
