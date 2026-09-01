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
 * The invitation is resolved on the server — that endpoint needs no credential
 * — so the page arrives as HTML with the subject's name already in it. The
 * form beneath is a client component, because recording audio is not something
 * a server can do.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Wordmark } from "@/components/layout/Wordmark";
import { ContributeForm } from "@/features/invitation";
import { fetchInvitation } from "@/features/invitation/server";
import { isApiError } from "@/lib/api/errors";

export const metadata: Metadata = {
  title: "Add what you remember",
};

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

  const years =
    invitation.born_year && invitation.through_year
      ? `${invitation.born_year} – ${invitation.through_year}`
      : invitation.born_year && invitation.subject_is_living
        ? `${invitation.born_year} – Present`
        : invitation.born_year
          ? `born ${invitation.born_year}`
          : null;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-6">
          {/* Unlinked: a contributor has nowhere in the app to go. */}
          <Wordmark />
          <p className="eyebrow-muted">Contributor space</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:py-16">
        <div className="space-y-8">
          <header className="space-y-4">
            <p className="eyebrow">A shared memory</p>
            <h1 className="font-heading text-[clamp(28px,5vw,40px)] leading-tight font-normal tracking-tight text-balance">
              Add what you remember.
            </h1>
            <p className="font-sans text-base leading-relaxed text-muted-foreground text-pretty">
              You&apos;ve been invited to leave a fragment for{" "}
              <span className="text-foreground">{invitation.subject_name}</span>
              {years && <span className="text-ink-faint"> · {years}</span>}. It
              can be a small detail, a photograph, or the story as you tell it.
            </p>
          </header>

          <ContributeForm token={token} invitation={invitation} />
        </div>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-6 py-6 font-sans text-xs text-ink-faint">
          A quieter place for the stories that made you.
        </div>
      </footer>
    </div>
  );
}
