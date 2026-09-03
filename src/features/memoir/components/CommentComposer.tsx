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
 * The name is asked for, and it is asked for every time rather than being
 * assumed — the same decision the contributor form makes, for the same reason:
 * the person reading a memoir on a shared family laptop is not always the same
 * person. It is prefilled from whoever last commented in this session, so
 * answering twice in a row costs nothing.
 *
 * Validation lives in `commentFormSchema`, not here. A component renders what
 * `react-hook-form` reports; it does not decide what counts as valid.
 */
export function CommentComposer({
  defaultName,
  replying,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  defaultName: string;
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
    defaultValues: { body: "", display_name: defaultName },
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

      <input
        {...register("display_name")}
        placeholder="Your name"
        aria-label="Your name"
        className="block w-full border-0 border-b border-rule bg-transparent pb-1 font-sans text-xs text-foreground placeholder:italic placeholder:text-ink-faint focus:border-seal focus:outline-none"
      />
      {errors.display_name && (
        <p className="font-sans text-xs text-seal">
          {errors.display_name.message}
        </p>
      )}

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
