"use client";

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
 * "One link, for everyone" — the half of the archive's second band that turns
 * one person's archive into a family's.
 *
 * It shows the address rather than hiding it behind a Copy button, per the link
 * box in `docs/DESIGN-SYSTEM.md` §7: a person about to send this to their aunt
 * wants to see what they are sending. The URL is Inter and breakable; the
 * button beside it swaps its label for a moment and swaps back.
 *
 * It stays on the page after the first contributor arrives, because inviting
 * more people is not a one-time setup step; a memoir gets richer the longer the
 * link keeps travelling.
 */
export function InviteBanner({ linkToken }: { linkToken: string | null }) {
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy");

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
    const done = () => showCopyLabel("Copied", 1800);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(done, done);
    } else {
      done();
    }
  }

  return (
    <section>
      <p className="eyebrow">One link, for everyone</p>
      <h2 className="mt-3 font-heading text-xl leading-snug font-normal">
        Invite someone who remembers.
      </h2>
      <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
        {inviteUrl
          ? "Contributors add their voice, photographs and writing from any phone. Nobody makes an account."
          : "The share link has been revoked. Issue a new one from the contributors page."}
      </p>

      {inviteUrl && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3.5 border border-border bg-paper-deep py-3.5 pr-3.5 pl-5">
          <span className="min-w-0 font-sans text-[13.5px] break-all">
            {inviteUrl.replace(/^https?:\/\//, "")}
          </span>
          <Button size="sm" onClick={copyLink}>
            {copyLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
