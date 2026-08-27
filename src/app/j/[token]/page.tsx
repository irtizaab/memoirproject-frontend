/**
 * The contributor's way in — the frontend twin of the backend's
 * `src/api/links.py`.
 *
 * `/j/` is short on purpose: this URL gets forwarded in WhatsApp messages and
 * read aloud over the phone, so every character is one more chance to mistype.
 *
 * A server component, so the invitation is resolved during rendering and
 * arrives as HTML. No loading spinner, and the token never has to be handled
 * by client-side JavaScript.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvitationCard } from "@/features/invitation";
import { fetchInvitation } from "@/features/invitation/server";
import { isApiError } from "@/lib/api/errors";

export const metadata: Metadata = {
  title: "You've been invited — The Memoir Project",
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
    // 404 from the backend means the token is unknown *or* revoked; it does
    // not say which, and neither does this page. Anything else — the backend
    // being down, a contract mismatch — is a real fault and should surface as
    // an error rather than be disguised as a missing page.
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">You&apos;ve been invited</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Add a memory
        </h1>
      </header>

      <InvitationCard invitation={invitation} />

      <p className="text-sm text-muted-foreground">
        The contribute flow is not built yet — this page confirms the link
        resolves to a real memoir.
      </p>
    </main>
  );
}
