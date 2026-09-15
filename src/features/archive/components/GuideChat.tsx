"use client";

/**
 * The owner's conversation with the guide about how the book is planned.
 *
 * A short message list and one box. The outline is a thing the guide says —
 * after every build, numbered, with the reviewer's findings — and the guide
 * changes it in words: renaming, reordering and dropping chapters by number,
 * or planning the memoir again when the memories should divide differently.
 * Either way the book is rebuilt and the reply carries the outline as it now
 * stands.
 *
 * No typing indicator, no avatars, no timestamps. The one thing shown while a
 * reply is on its way is the owner's own message, so a question that takes
 * minutes to answer does not read as lost.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat, useSendChat } from "@/features/archive/hooks";
import { cn } from "@/lib/utils";

export function GuideChat({ memoirId }: { memoirId: string | null }) {
  const chat = useChat(memoirId);
  const send = useSendChat(memoirId);
  const [draft, setDraft] = useState("");

  const messages = chat.data ?? [];
  // The newest message is the one being read; keep it in view as the list
  // grows past its height.
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.length, send.isPending]);
  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft("");
    send.mutate(body);
  };

  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="font-heading text-base leading-snug font-normal">
        Ask the guide
      </h3>
      <p className="mt-1 font-sans text-xs text-ink-faint">
        Why the book is divided as it is, what would help, or how you would
        rather it were — rename a chapter, move one, leave one out, or divide
        the memories differently. It makes the change and rebuilds the book.
      </p>

      {messages.length > 0 && (
        <ol className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "max-w-prose rounded-xl px-3.5 py-2.5 font-sans text-sm whitespace-pre-line",
                message.role === "owner"
                  ? "ml-auto bg-paper-deep text-foreground"
                  : "bg-card text-ink-soft",
              )}
            >
              {message.body}
              {message.replanned && (
                <span className="mt-1 block text-xs text-ink-faint">
                  The book was rebuilt.
                </span>
              )}
            </li>
          ))}
          <li ref={end} aria-hidden className="h-px" />
        </ol>
      )}

      {send.isPending && (
        <p className="mt-3 flex items-center gap-2 font-sans text-xs text-ink-faint">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          The guide is answering. If it plans again, this takes a few minutes.
        </p>
      )}

      {send.isError && (
        <p className="mt-3 font-sans text-sm text-seal">{send.error.message}</p>
      )}

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          aria-label="Message to the guide"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Keep the war years together…"
          maxLength={4000}
          rows={2}
          disabled={send.isPending}
        />
        <Button type="submit" disabled={send.isPending || !draft.trim()}>
          <Send aria-hidden className="size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
