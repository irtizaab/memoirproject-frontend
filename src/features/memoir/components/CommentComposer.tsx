"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  commentFormSchema,
  type CommentFormValues,
} from "@/features/memoir/schemas";

/**
 * Leaving a comment, or replying to one.
 *
 * It used to ask for a name here, every time. The door asks now — once, before
 * the memoir opens — so this says whose it will be rather than asking again.
 * The person reading a memoir on a shared family laptop is still handled: they
 * are whoever opened it, and opening it again is how somebody else becomes the
 * person leaving reflections.
 *
 * Validation lives in `commentFormSchema`, not here. A component renders what
 * `react-hook-form` reports; it does not decide what counts as valid.
 */
export function CommentComposer({
  readerName,
  replying,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  /** Whoever opened the memoir. Shown, not asked for. */
  readerName: string;
  replying?: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: CommentFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <textarea
        {...register("body")}
        autoFocus
        rows={3}
        placeholder={replying ? "Reply…" : "Add a comment…"}
        aria-label={replying ? "Your reply" : "Your comment"}
        className="block w-full resize-y border-0 border-b border-ink bg-transparent pb-1.5 font-heading text-sm leading-relaxed font-light text-foreground placeholder:font-heading placeholder:italic placeholder:text-ink-faint focus:border-seal focus:outline-none"
      />
      {errors.body && (
        <p className="font-sans text-xs text-seal">{errors.body.message}</p>
      )}

      {/*
        Who this will be from, stated rather than asked. A reflection in a
        memoir is always signed, and the signature was settled at the door.
      */}
      <p className="font-sans text-xs text-ink-faint">
        Leaving this as <span className="text-ink-soft">{readerName}</span>
      </p>

      {/*
        A failed comment says so in words. There is no colour for error in this
        product — the weight comes from the sentence, not from a red banner.
      */}
      {error && <p className="font-sans text-xs text-seal">{error}</p>}

      <div className="flex items-center gap-3.5">
        <button
          type="submit"
          disabled={pending}
          className="bg-seal px-4 py-2.5 font-sans text-[10px] font-medium tracking-[0.14em] text-paper uppercase transition-colors hover:bg-seal-dark disabled:bg-paper-deep disabled:text-ink-faint"
        >
          {pending ? "Leaving it…" : replying ? "Reply" : "Leave this"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-b border-rule pb-0.5 font-sans text-[11px] font-medium tracking-[0.12em] text-ink-soft uppercase transition-colors hover:border-seal hover:text-seal"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
