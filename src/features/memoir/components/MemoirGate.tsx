"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  useContributorToken,
  useRememberContributorFor,
} from "@/features/invitation";
import { openMemoir } from "@/features/memoir/api";
import {
  rememberMemoir,
  recallMemoir,
  storeReaderSession,
} from "@/features/memoir/readerSession";
import { gateFormSchema, type GateFormValues } from "@/features/memoir/schemas";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { authHeaders } from "@/lib/supabase/client";
import { isApiError } from "@/lib/api/errors";

/**
 * The door.
 *
 * Everything about `/m/[token]` is server-rendered so the prose arrives in the
 * first response. This is the one part that cannot be: it asks for something,
 * and it has to look in the browser for two things the server cannot see — a
 * signed-in session, and the participant token from having contributed before.
 *
 * ---------------------------------------------------------------------------
 * Two people knock, and only one of them is asked anything
 * ---------------------------------------------------------------------------
 * The owner is let straight through. They set the passphrase, they may not
 * have it to hand, and their account already carries their name — asking a
 * woman to type "Sarah, daughter" to read her own mother's memoir is the
 * product forgetting whose it is. So if there is a Supabase session in this
 * browser, the gate tries it silently before showing anybody a form. When the
 * memoir is not theirs the attempt 404s and the form appears as usual.
 *
 * Everybody else gives the passphrase and their name. The name is not a
 * credential and proves nothing; it is here because this is the moment the
 * product has always needed it. Reflections used to collect a name at the
 * point of writing one, which meant a person could read a whole family's
 * memoir as nobody at all and be asked who they were only if they had
 * something to say.
 */
export function MemoirGate({
  token,
  subjectName,
}: {
  token: string;
  /** Null when the memoir has not been opened yet, which is the usual case. */
  subjectName: string | null;
}) {
  const router = useRouter();
  const { session: account, isPending: accountPending } = useSupabaseSession();

  // Whatever this browser holds from having been here before. The gate hands
  // it up so the backend resolves the same participant rather than creating a
  // second one — the whole point of `contributorStorage`.
  //
  // It is keyed on the memoir, and at this moment we hold a link rather than a
  // memoir: the id is what the door hands back. So the reader side keeps a note
  // of which memoir a link opened, written the first time somebody got in.
  // A brand new link on a browser that has only ever contributed through `/j/`
  // is the one case this cannot recover, and it costs a duplicate name in the
  // index rather than anything a family loses.
  const knownMemoir = recallMemoir(token);
  const participantToken = useContributorToken(knownMemoir ?? "", token);
  const remember = useRememberContributorFor();

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ownerTried = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GateFormValues>({
    resolver: zodResolver(gateFormSchema),
    defaultValues: { passphrase: "", display_name: "", relationship: "" },
  });

  /**
   * Let the session hold, then re-render the page from the server.
   *
   * `router.refresh()` rather than a client-side fetch, because the book is a
   * server render: the cookie is written first, so the next render arrives
   * with the whole chapter in it.
   */
  const admit = (session: {
    reader_token: string;
    participant_token: string | null;
    memoir_id: string;
    display_name: string;
  }) => {
    storeReaderSession(token, session.reader_token, session.display_name);
    rememberMemoir(token, session.memoir_id);
    remember(session.memoir_id, session.participant_token);
    router.refresh();
  };

  // The owner's silent attempt, once, as soon as we know there is a session.
  //
  // The bearer token is the whole request: the backend reads it, sees this
  // account owns the memoir the link points at, and issues a session without
  // asking for anything. Without the header it is just an anonymous open with
  // no passphrase, which is a 404 — so the owner would be shown a form asking
  // for a passphrase they set themselves.
  useEffect(() => {
    if (accountPending || !account || ownerTried.current) return;
    ownerTried.current = true;

    void authHeaders()
      .then((headers) => openMemoir(token, {}, { headers }))
      .then(admit)
      // Not theirs. Nothing to say — the form below is the answer.
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountPending, account, token]);

  const submit = async (values: GateFormValues) => {
    setPending(true);
    setError(null);

    try {
      const session = await openMemoir(token, {
        passphrase: values.passphrase,
        display_name: values.display_name,
        relationship: values.relationship || undefined,
        participant_token: participantToken ?? undefined,
      });
      admit(session);
    } catch (caught) {
      // 404 is every way of being wrong — an unknown link, a revoked one, a
      // passphrase that does not match. The backend refuses to tell them
      // apart, and neither does this: saying "that link is real but your
      // passphrase is wrong" is what turns a forwarded link into something
      // worth guessing at.
      setError(
        isApiError(caught) && caught.status === 404
          ? "That passphrase does not open this memoir."
          : isApiError(caught) && caught.status === 400
            ? "Say who you are before opening the memoir."
            : "Something went wrong opening this. Try again in a moment.",
      );
      setPending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
        <p className="eyebrow">A shared family memoir</p>
        <h1 className="mt-2 font-heading text-2xl leading-tight font-normal">
          {subjectName
            ? `The memoir of ${subjectName}`
            : "This memoir is private"}
        </h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
          It opens with the passphrase whoever shared the link gave you. Your
          name goes on anything you add — nobody reads a family memoir as a
          stranger, and nobody signs their reflections twice.
        </p>

        <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="gate-passphrase"
              className="eyebrow-muted mb-1.5 block"
            >
              Passphrase
            </label>
            <input
              id="gate-passphrase"
              type="password"
              autoComplete="off"
              {...register("passphrase")}
              className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground placeholder:text-ink-faint focus:border-seal focus:outline-none"
              placeholder="The passphrase you were given"
            />
            {errors.passphrase && (
              <p className="mt-1.5 font-sans text-xs text-seal">
                {errors.passphrase.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gate-name" className="eyebrow-muted mb-1.5 block">
              Your name
            </label>
            <input
              id="gate-name"
              autoComplete="name"
              {...register("display_name")}
              className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground placeholder:text-ink-faint focus:border-seal focus:outline-none"
              placeholder="Clara Harrison"
            />
            {errors.display_name && (
              <p className="mt-1.5 font-sans text-xs text-seal">
                {errors.display_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gate-relationship"
              className="eyebrow-muted mb-1.5 block"
            >
              How you knew them
            </label>
            <input
              id="gate-relationship"
              {...register("relationship")}
              className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-sans text-sm text-foreground placeholder:text-ink-faint focus:border-seal focus:outline-none"
              placeholder="Granddaughter"
            />
            <p className="mt-1.5 font-sans text-xs text-ink-faint">
              In your own words, and optional.
            </p>
          </div>

          {/*
            A failure says so in a sentence. There is no colour for error in
            this product — the weight comes from the words.
          */}
          {error && <p className="font-sans text-sm text-seal">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-seal px-5 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-seal-dark disabled:bg-paper-deep disabled:text-ink-faint"
          >
            {pending ? "Opening…" : "Open the memoir"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center font-sans text-xs leading-relaxed text-ink-faint">
        Preserving generational memories with quiet dignity.
      </p>
    </main>
  );
}
