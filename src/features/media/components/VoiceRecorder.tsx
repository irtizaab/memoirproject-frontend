"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Record a voice note in the browser, play it back, keep it or discard it.
 *
 * The product's reason for existing, in one component: the people with the
 * most to say about someone are often the least willing to type it. This has
 * to work on a phone, held by someone who has not installed anything.
 *
 * Three things about `MediaRecorder` that shape the code below:
 *
 *  1. **Browsers record different formats.** Chrome and Firefox produce webm/
 *     opus, iOS Safari produces mp4/aac. Nothing is transcoded — the recorded
 *     type is stored as the asset's mime type and `<audio>` plays whichever it
 *     is. `isTypeSupported` picks the first one this browser admits to.
 *
 *  2. **It needs a secure context.** `getUserMedia` is unavailable over plain
 *     http, with the deliberate exception of localhost. That is invisible in
 *     development and fatal on first deploy, so the failure says so.
 *
 *  3. **The microphone keeps running after you stop.** Every track has to be
 *     stopped by hand or the browser's recording indicator stays lit — which,
 *     on this product in particular, is exactly the wrong thing to leave on.
 *
 * It keeps a **list**. One memory can hold several recordings alongside its
 * photographs and its writing — a person often remembers one more thing a
 * minute after they stop talking, and making them save a second memory for it
 * is the wrong shape.
 */

/** Candidate container/codec pairs, best first. */
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function supportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** `93` → `1:33`. Seconds, because nobody counts a story in milliseconds. */
function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type Recording = {
  blob: Blob;
  durationMs: number;
  /** Object URL for playback. Revoked when the recording is discarded. */
  previewUrl: string;
};

export function VoiceRecorder({
  recordings,
  onRecorded,
  onRemoved,
  disabled,
}: {
  recordings: Recording[];
  /** Called with each finished recording, to be appended to the list. */
  onRecorded: (recording: Recording) => void;
  /** Removes one by index. The caller revokes its preview URL. */
  onRemoved: (index: number) => void;
  disabled?: boolean;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Release the microphone and the ticking timer.
   *
   * Called from stop, from the error path, and from unmount — anywhere the
   * recorder might still be live. Leaving a track open keeps the browser's
   * recording indicator on long after the user thinks they stopped.
   */
  const releaseHardware = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => releaseHardware, [releaseHardware]);

  async function startRecording() {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError(
        "This browser will not let a page use the microphone here. Recording " +
          "needs a secure (https) connection.",
      );
      return;
    }

    const mimeType = supportedMimeType();
    if (!mimeType) {
      setError("This browser cannot record audio. You can write it down instead.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Denied, dismissed, or no microphone — all indistinguishable from here,
      // and all answered the same way by the person reading it.
      setError(
        "The microphone is not available. Check the permission for this site, " +
          "or write the memory down instead.",
      );
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      releaseHardware();
      setIsRecording(false);
      setElapsedMs(0);

      // A recording of nothing is a slip, not a memory. Below a second it is
      // almost always a mis-tap, and saving it would put an empty player in
      // somebody's archive forever.
      if (durationMs < 1000) {
        setError("That was too short to keep. Hold on a moment and try again.");
        return;
      }

      onRecorded({
        blob,
        durationMs,
        previewUrl: URL.createObjectURL(blob),
      });
    };

    // A timeslice, so long recordings flush progressively rather than being
    // held whole in memory until stop.
    recorder.start(1000);
    setIsRecording(true);
    tickRef.current = setInterval(
      () => setElapsedMs(Date.now() - startedAtRef.current),
      200,
    );
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <div className="space-y-3">
      {recordings.length > 0 && (
        <ul className="space-y-3">
          {recordings.map((recording, index) => (
            <li
              key={recording.previewUrl}
              className="space-y-3 rounded-lg border border-border bg-paper-deep p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-sans text-sm text-foreground">
                  Recorded · {formatDuration(recording.durationMs)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoved(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
              {/* No caption track: this is audio the person spoke into the page
                  a moment ago, and there is nothing to caption it with. */}
              <audio controls src={recording.previewUrl} className="w-full" />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-paper-deep p-4">
        <Button
          type="button"
          variant={isRecording ? "outline" : "default"}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
        >
          {isRecording
            ? "Stop"
            : recordings.length > 0
              ? "Record another"
              : "Start recording"}
        </Button>

        {isRecording ? (
          <p
            className="font-sans text-sm text-foreground"
            aria-live="polite"
            aria-atomic
          >
            <span
              aria-hidden
              className="mr-2 inline-block size-2 animate-pulse rounded-full bg-seal align-middle"
            />
            {formatDuration(elapsedMs)}
          </p>
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            Speak as you would tell it. Nothing is sent until you save.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="font-sans text-sm text-seal">
          {error}
        </p>
      )}
    </div>
  );
}
