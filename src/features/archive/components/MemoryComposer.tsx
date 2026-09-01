"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Mic, Plus, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveMemoir } from "@/features/account";
import { useCreateMemory } from "@/features/archive/hooks";
import {
  memoryFormSchema,
  type MemoryFormValues,
} from "@/features/archive/schemas";
import {
  PhotoPicker,
  VoiceRecorder,
  uploadAll,
  useAttachments,
  type Mode,
} from "@/features/media";

/**
 * The three ways in, in the order the mockup shows them.
 *
 * They are **toggles, not a choice.** All three can be lit at once, because an
 * afternoon is often a photograph, a story about it, and someone's voice
 * remembering the rest — and making a person file those as three separate
 * memories is the wrong shape for what they are.
 */
const MODES: {
  mode: Mode;
  label: string;
  hint: string;
  Icon: typeof Mic;
}[] = [
  { mode: "voice", label: "Voice note", hint: "Speak it as you would tell it.", Icon: Mic },
  { mode: "photo", label: "Photographs", hint: "Keep the images and their context together.", Icon: ImageIcon },
  { mode: "text", label: "Write it down", hint: "Start anywhere. The details can arrive later.", Icon: Type },
];

/**
 * "Begin with what you remember." — the owner's composer.
 *
 * Media is uploaded first and the memory created afterwards, because a file
 * needs somewhere to go before there is a row to attach it to. That ordering is
 * why `onSubmit` below is a sequence rather than one call.
 *
 * `kind` is not sent. The backend derives it from what the memory actually
 * holds — see `_derive_kind` in the API's `memory_service.py`.
 */
export function MemoryComposer() {
  const router = useRouter();
  const { memoir } = useActiveMemoir();
  const create = useCreateMemory(memoir?.id ?? null);

  const attachments = useAttachments(["text"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues: { title: "", body_text: "", happened_on: "" },
  });

  const busy = isUploading || create.isPending;

  function toggle(mode: Mode) {
    // The text lives in react-hook-form rather than in the hook, so clearing
    // it on the way out is this component's job.
    if (mode === "text" && attachments.isActive("text")) {
      form.setValue("body_text", "");
    }
    attachments.toggle(mode);
  }

  async function onSubmit(values: MemoryFormValues) {
    setProblem(null);

    if (!memoir) {
      setProblem("No memoir is loaded yet. Give it a moment and try again.");
      return;
    }

    // Only text from a section that is actually lit counts. A paragraph typed
    // and then switched off should not save.
    const body = attachments.isActive("text")
      ? (values.body_text?.trim() ?? "")
      : "";

    /*
      One rule now, not three. A memory needs *something* in it — which is the
      same rule the backend enforces (`EmptyMemory` -> 400) and, underneath
      that, the database's `memory_text_has_body`. Said here so the person
      hears it before a round trip rather than after.
    */
    if (
      !body &&
      attachments.photos.length === 0 &&
      attachments.recordings.length === 0
    ) {
      setProblem(
        "Add something first — a few words, a photograph, or a recording.",
      );
      return;
    }

    try {
      setIsUploading(true);
      const assetIds = await uploadAll(
        [
          ...attachments.recordings.map((recording) => ({
            blob: recording.blob,
            kind: "audio" as const,
            durationMs: recording.durationMs,
          })),
          ...attachments.photos.map((photo) => ({
            blob: photo.blob,
            kind: "image" as const,
            filename: photo.filename,
          })),
        ],
        { memoirId: memoir.id, credential: { kind: "owner" } },
      );
      setIsUploading(false);

      await create.mutateAsync({
        title: values.title?.trim() || null,
        body_text: body || null,
        happened_on: values.happened_on?.trim() || null,
        asset_ids: assetIds,
      });

      router.push("/archive");
    } catch (error) {
      setIsUploading(false);
      setProblem(
        error instanceof Error
          ? error.message
          : "That could not be saved. Nothing has been lost — try again.",
      );
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="New memory"
        title="Begin with what you remember."
        description="Use any of these together — write it down, add photographs, record your voice. You can always return to refine or add another fragment later."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <fieldset className="space-y-3" disabled={busy}>
          <legend className="sr-only">
            What would you like to add? Choose any.
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {MODES.map(({ mode, label, hint, Icon }) => {
              const on = attachments.isActive(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggle(mode)}
                  aria-pressed={on}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    on
                      ? "border-seal bg-seal-wash"
                      : "border-border bg-paper-deep hover:border-ink-faint"
                  }`}
                >
                  <Icon aria-hidden className="mb-3 size-5 text-seal" />
                  <p className="font-sans text-sm font-medium">{label}</p>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                    {hint}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="title">Give this memory a title</Label>
          <Input
            id="title"
            placeholder="A name for this moment"
            disabled={busy}
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="font-sans text-sm text-seal">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        {attachments.isActive("voice") && (
          <VoiceRecorder
            recordings={attachments.recordings}
            onRecorded={attachments.addRecording}
            onRemoved={attachments.removeRecording}
            disabled={busy}
          />
        )}

        {attachments.isActive("photo") && (
          <PhotoPicker
            photos={attachments.photos}
            onPicked={attachments.addPhotos}
            onRemoved={attachments.removePhoto}
            disabled={busy}
          />
        )}

        {attachments.isActive("text") && (
          <div className="space-y-2">
            <Label htmlFor="body_text">What happened?</Label>
            <Textarea
              id="body_text"
              placeholder="Write down the feeling, the details, or simply the first thing you can recall…"
              disabled={busy}
              {...form.register("body_text")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="happened_on">When was this? (optional)</Label>
          <Input
            id="happened_on"
            type="date"
            className="max-w-xs"
            disabled={busy}
            {...form.register("happened_on")}
          />
          {form.formState.errors.happened_on && (
            <p className="font-sans text-sm text-seal">
              {form.formState.errors.happened_on.message}
            </p>
          )}
        </div>

        {problem && (
          <p role="alert" className="font-sans text-sm text-seal">
            {problem}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy}>
            <Plus aria-hidden />
            {isUploading
              ? "Uploading…"
              : create.isPending
                ? "Saving…"
                : "Save memory"}
          </Button>
          <p className="font-sans text-xs text-ink-faint">
            Private and unpublished. Nothing is locked until you publish it
            yourself.
          </p>
        </div>
      </form>
    </div>
  );
}
