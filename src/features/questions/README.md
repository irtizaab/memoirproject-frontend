# `features/questions`

The owner's side of the question library: what everyone who opens the share
link is asked before the box they write in.

Backend twin: `src/api/prompts.py`, `src/domain/prompts/prompt_service.py`,
`src/domain/prompts/standard_questions.py`, and `migrations/0014_prompts.sql`.

## Why the owner is in the middle of this

An earlier version of this feature wrote a question for each contributor as
they arrived, out of whatever they had just left, and the owner never saw any
of it. A model was deciding — unsupervised, one person at a time — what a
grieving family would be asked about somebody they had lost, with no way for
the person who started the memoir to read those questions, fix one, or refuse
them.

This feature is that one with the owner put back in the middle. The model
drafts, the owner reads and edits, and only then is anybody asked anything.
That order is the whole design; everything else here follows from it.

## Two sets, and neither is "off"

`questions_mode` is `standard` or `custom`:

- **standard** — the set written into `standard_questions.py` on the backend.
  Every memoir starts here, because an owner who never opens this screen must
  still have questions. The alternative default is a blank page for the family
  of anyone who did not know the screen existed.
- **custom** — drafted from what the owner said about the subject, then edited
  by them.

**The screen does not show this choice.** It used to, as radios — both are a
real answer to "what should my family be asked", and a switch would have implied
one of them was the feature turned off. But writing a set already sets the mode
to `custom` on the backend (`prompt_service.py`), so the control's only correct
answer was the one pressing the button had just given. The page now shows what a
contributor would actually be asked today and says nothing about which bucket it
came from.

The mode is still real and `useSetQuestionsMode` is still exported against a
live endpoint; it simply has no caller in the UI. Switching to `standard`
**does not delete** the custom set either, which is what would make re-exposing
the choice safe if it is ever wanted back.

## Questions are per relationship

What you ask a widow is not what you ask a colleague, so a library is four or
five questions for each `relationship_group` the owner is shown. There are six
values in the enum and **five of them are shown**: `self` means the subject
writing their own memoir, which nobody arriving through a share link is doing,
so it is absent from `GROUP_ORDER` while staying in the schema so a response
carrying it still parses. `GROUP_LABELS`
names them from the subject's side ("Their grandchildren"), deliberately not
reusing onboarding's `RELATIONS`, which is phrased from the owner's own side
("My grandparent") and would read as nonsense as a section heading.

This depends on `features/invitation` asking contributors which group they are
in. Until it did, every contributor in every memoir was stored as `other`.

## `source` is what makes editing safe

Every question carries `ai`, `standard`, or `owner`. A question becomes `owner`
the moment it is edited by hand, and that is the entire mechanism behind
"writing them again keeps what you wrote": a rewrite replaces the `ai` rows and
leaves the `owner` ones alone.

Losing a generated question costs a model call. Losing a hand-written one costs
the sentence a person chose, and they will not remember it. `replace_edited` is
the owner saying "start again" — theirs to say, and never the default.

## Failure is survivable and is shown

`useGenerateLibrary` deliberately does **not** swallow errors, unlike most
mutations in this codebase. The owner pressed a button and is watching; a
failure they are not told about looks like a button that does nothing.

The backend answers **503**, not 500 — nothing is broken, an upstream service
was away or switched off. The notes are saved *before* the model is called, so
a failure never costs the paragraph they typed, and the standard questions are
still there. The error copy says both.

## What this feature must never grow

No count of questions, no "5 of 5", no completion state, no praise for
generating a set, no nudge to write more. `AGENTS.md` forbids gamification and
a memoir has no denominator. The one label on the screen — "Yours — writing
them again will not replace this one" — is a state the owner needs before
pressing a button, not a score.

## Data path

Client only. Every call needs the owner's bearer token, which lives in the
browser, so there is no server render to be had — the same reason
`features/contributors` has no `queries.ts`.

Every mutation returns the whole library and is written straight into the cache
rather than invalidated, because the backend already sends the finished screen
back from each write. `useUpdateQuestion` patches the single row instead, so
editing one question does not re-render the other twenty-nine.
