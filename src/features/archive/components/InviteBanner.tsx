"use client";

import { UserPlus } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useTransientLabel } from "@/hooks/useTransientLabel";

/**
 * A subscribe function for a value that never changes after first render.
 * Module scope so its identity is stable — defined inline it would resubscribe
 * on every render.
 */
const subscribeToNothing = () => () => {};

/**
 * "Make it a shared story" — the banner that turns one person's archive into
 * a family's.
 *
 * It stays on the page after the first contributor arrives, because inviting
 * more people is not a one-time setup step; a memoir gets richer the longer
 * the link keeps travelling.
 */
export function InviteBanner({ linkToken }: { linkToken: string | null }) {
  const [copyLabel, showCopyLabel] = useTransientLabel("Invite contributor");

  // `window` does not exist during server rendering, so the origin is read as
  // an external store: "" on the server, the real origin in the browser, and
  // React reconciles the two without a hydration mismatch.
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  // The API returns a token and the frontend composes the URL. The backend has
  // no business knowing this domain — a staging deploy would otherwise hand
  // out production links.
  const inviteUrl = linkToken ? `${origin}/j/${linkToken}` : null;

  function copyLink() {
    if (!inviteUrl) return;
    const done = () => showCopyLabel("Link copied", 1800);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(done, done);
    } else {
      done();
    }
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-lg border border-border bg-paper-deep p-6">
      <div className="space-y-2">
        <p className="eyebrow">Make it a shared story</p>
        <h2 className="font-heading text-xl font-normal">
          Invite someone who remembers.
        </h2>
        <p className="max-w-lg font-sans text-sm leading-relaxed text-muted-foreground">
          {inviteUrl
            ? "Contributors get a private space to add their own voice, photos, and written recollections. They never make an account."
            : "The share link has been revoked. Issue a new one from the contributors page."}
        </p>
      </div>

      <Button variant="outline" onClick={copyLink} disabled={!inviteUrl}>
        <UserPlus aria-hidden />
        {copyLabel}
      </Button>
    </section>
  );
}
