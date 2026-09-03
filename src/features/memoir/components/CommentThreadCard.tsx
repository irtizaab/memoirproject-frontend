"use client";

import type { CommentThread } from "@/features/memoir/schemas";
import { relationshipLabel } from "@/features/memoir/utils";
import { cn } from "@/lib/utils";

/**
 * One conversation in the comment lane.
 *
 * Always visible, clamped to its first two lines, level with the text it is
 * about. Focusing it — by clicking the card, the words it points at, or the
 * mark in the gutter — opens it fully and lights its anchor in the prose.
 *
 * This is the only layer of a published memoir that is allowed to grow, and
 * the design says so by giving it its own column rather than a drawer. A
 * memoir that has been read for ten years should *look* like it has been.
 */
export function CommentThreadCard({
  thread,
  focused,
  onFocus,
  onReply,
  children,
}: {
  thread: CommentThread;
  focused: boolean;
  onFocus: () => void;
  onReply: () => void;
  /** The reply composer, when this thread is the one being replied to. */
  children?: React.ReactNode;
}) {
  const [lead, ...rest] = thread.comments;
  if (!lead) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocus();
        }
      }}
      className={cn(
        "border bg-paper-deep p-3.5 text-left transition-colors",
        focused ? "border-seal" : "border-border",
      )}
    >
      {(focused ? thread.comments : [lead]).map((comment) => (
        <article key={comment.id} className="mb-3 last:mb-0">
          <header className="mb-2 flex items-baseline justify-between gap-2.5">
            <span
              className={cn(
                "font-sans text-[9.5px] font-medium tracking-[0.14em] uppercase",
                focused ? "text-seal" : "text-ink-faint",
              )}
            >
              {comment.name}
              {/* The owner is marked, because "the keeper of this memoir said
                  this" is different from "someone who was there said this".
                  Everyone else is described only if somebody said how they
                  were related — an unstated relationship prints nothing. */}
              {comment.is_owner
                ? " · Keeper"
                : relationshipLabel(comment.relationship)
                  ? ` · ${relationshipLabel(comment.relationship)}`
                  : ""}
            </span>
          </header>
          <p
            className={cn(
              "font-heading text-[13.5px] leading-relaxed font-light text-foreground",
              !focused && "line-clamp-2",
            )}
          >
            {comment.body}
          </p>
        </article>
      ))}

      {!focused && rest.length > 0 && (
        <span className="mt-2 block font-sans text-[9.5px] font-medium tracking-[0.14em] text-ink-faint uppercase">
          {rest.length} more {rest.length === 1 ? "reply" : "replies"}
        </span>
      )}

      {focused && !children && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReply();
          }}
          className="mt-3 border-b border-rule pb-0.5 font-sans text-[11px] font-medium tracking-[0.12em] text-ink-soft uppercase transition-colors hover:border-seal hover:text-seal"
        >
          Reply
        </button>
      )}

      {children && (
        <div
          className="mt-3.5 border-t border-border pt-3"
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
