/**
 * The contributor's way in — the frontend twin of the backend's
 * `src/api/links.py`.
 *
 * `/j/` is short on purpose: this URL gets forwarded in WhatsApp messages and
 * read aloud over the phone, so every character is one more chance to mistype.
 *
 * Outside the `(app)` route group, and with its own chrome, because the person
 * reading it has no account and never will. The signed-in navigation would be
 * four dead ends.
 *
 * It is also the only screen most of a family will ever see, which is why it
 * opens with **who the memoir is for** — the cover, the years, and the name of
 * whoever sent the link — before it asks anything. It used to open with a name
 * field, five chips and an empty box.
 *
 * The invitation is resolved on the server — that endpoint needs no credential
 * — so the page arrives as HTML with the subject's name already in it. The
 * form beneath is a client component, because recording audio is not something
 * a server can do.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookCover } from "@/components/BookCover";
import { Wordmark } from "@/components/layout/Wordmark";
import { ContributeForm } from "@/features/invitation";
import { fetchInvitation } from "@/features/invitation/server";
import { isApiError } from "@/lib/api/errors";

export const metadata: Metadata = {
  title: "Add what you remember",
};

/**
 * The photograph behind the opening band, felt more than seen. One of the six
 * in `public/Images/`, dropped low so the cover and the headline stay legible.
 */
const BAND_PHOTOGRAPH = "/Images/a19272d2-03a9-4fa4-8f41-f0e3f9e869ed.jpg";

export default async function InvitationPage({
  params,
}: {
  // A Promise in Next 16 — dynamic params are awaited, not read directly.
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let invitation;
  try {
    invitation = await fetchInvitation(token);
  } catch (error) {
    // 404 from the backend means the token is unknown, revoked, view-only, or
    // that the memoir has been published and is now closed to new material. It
    // does not say which, and neither does this page. Anything else — the
    // backend being down, a contract mismatch — is a real fault and should
    // surface as an error rather than be disguised as a missing page.
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }

  /*
    The cover always reads "— Forever": the finished book is not bounded by the
    second date, only the timeline and the memoir page are.
  */
  const coverYears = invitation.born_year
    ? `${invitation.born_year} — Forever`
    : null;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-6">
          {/* Unlinked: a contributor has nowhere in the app to go. */}
          <Wordmark />
          <p className="eyebrow-muted">No account needed</p>
        </div>
      </header>

      {/* Who this is for, before what to do. */}
      <div className="relative overflow-hidden border-b border-border bg-paper-deep">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_55%] opacity-[0.14]"
          style={{ backgroundImage: `url(${BAND_PHOTOGRAPH})` }}
        />

        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-9 px-6 pt-11 pb-10 sm:flex-row sm:gap-12">
          <BookCover
            compact
            name={invitation.subject_name}
            years={coverYears}
            dedication={
              invitation.subject_is_living
                ? "The life of"
                : "In loving memory of"
            }
          />

          <div className="min-w-0 flex-1">
            <p className="eyebrow">
              {invitation.invited_by
                ? `${invitation.invited_by} invited you`
                : "You have been invited"}
            </p>
            <h1 className="mt-3.5 font-heading text-[clamp(28px,5vw,38px)] leading-[1.12] font-normal tracking-tight text-balance">
              Tell us something about {invitation.subject_name.split(" ")[0]}.
            </h1>
            <p className="mt-4 max-w-[50ch] font-sans text-[15px] leading-[1.7] text-muted-foreground text-pretty">
              {invitation.invited_by || "The family"} is putting together a
              memoir of their life, and it will only hold what people bother to
              say. A small detail is worth as much as a long story.
            </p>
            <p className="mt-4 font-sans text-xs text-ink-faint">
              You do not need an account, and nothing you write is public.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-11 md:py-14">
        <ContributeForm token={token} invitation={invitation} />
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto w-full max-w-4xl px-6 py-6 font-sans text-xs text-ink-faint">
          A quieter place for the stories that made you.
        </div>
      </footer>
    </div>
  );
}
