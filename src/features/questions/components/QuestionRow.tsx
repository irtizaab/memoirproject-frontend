"use client";

import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteQuestion,
  useUpdateQuestion,
} from "@/features/questions/hooks";
import type { Question } from "@/features/questions/schemas";

/**
 * One question, readable until you click it and editable after.
 *
 * Not a permanently-open textarea per question. Thirty boxes on one screen
 * reads as a form to fill in, and this screen is something you skim to check
 * what your family will be asked — most owners will change one question or
 * none.
 *
 * The only badge is on a question the owner has rewritten, and it is there to
 * carry one fact they need before pressing "Write them again": this one will
 * survive that. It is a state, not a score.
 */
export function QuestionRow({
  memoirId,
  question,
  index,
}: {
  memoirId: string;
  question: Question;
  /** Position in its group, 1-based. Omitted renders no numeral. */
  index?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.body);

  const update = useUpdateQuestion(memoirId);
  const remove = useDeleteQuestion(memoirId);

  function save() {
    const body = draft.trim();
    // An empty question would fail `prompt_body_not_blank` at the database.
    // Clearing the box is much more likely to mean "cancel" than "delete", and
    // delete is one control to the right.
    if (!body || body === question.body) {
      setDraft(question.body);
      setEditing(false);
      return;
    }
    update.mutate(
      { questionId: question.id, body },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (editing) {
    return (
      <li className="space-y-2 border-b border-border py-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // Enter saves; Shift+Enter is a newline nobody needs in a question,
          // but Escape has to work or the only way out of a mis-click is to
          // save something.
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              save();
            }
            if (event.key === "Escape") {
              setDraft(question.body);
              setEditing(false);
            }
          }}
          autoFocus
          rows={2}
          disabled={update.isPending}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(question.body);
              setEditing(false);
            }}
          >
            <X aria-hidden />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={update.isPending}
          >
            <Check aria-hidden />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-baseline gap-4 border-b border-border py-4 sm:gap-[18px]">
      {index !== undefined && (
        <span className="w-3.5 shrink-0 font-sans text-[10.5px] font-medium text-ink-faint">
          {index}
        </span>
      )}

      <div className="min-w-0 flex-1">
        {/*
          Set at reading size in Spectral. These are sentences a person reads
          and answers out loud, and they were 14px grey Inter — the register the
          interface uses to talk about itself.
        */}
        <p className="font-heading text-[17px] leading-[1.55] font-light">
          {question.body}
        </p>
        {question.source === "owner" && (
          <p className="mt-1 font-sans text-xs text-ink-faint">
            Yours — writing them again will not replace this one.
          </p>
        )}
      </div>

      {/*
        Always present, never hover-revealed. The controls used to be
        `opacity-0` until `group-hover`, which on a touch screen means every
        question on this page is uneditable — and this product is used on a
        phone as often as a laptop.
      */}
      <div className="flex shrink-0 items-baseline gap-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase transition-colors hover:text-seal"
        >
          Rewrite
        </button>
        <button
          type="button"
          onClick={() => remove.mutate(question.id)}
          aria-label={`Remove: ${question.body}`}
          className="text-ink-faint transition-colors hover:text-seal"
        >
          <Trash2 aria-hidden className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
