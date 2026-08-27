"use client";

import { useSyncExternalStore } from "react";

import { PEOPLE } from "@/features/onboarding/data";
import { useMe } from "@/features/onboarding/hooks";
import type { MemoirSummary } from "@/features/onboarding/schemas";
import type { OnboardingState } from "@/features/onboarding/types";
import { firstName, possessive } from "@/features/onboarding/utils";
import { useTransientLabel } from "@/features/onboarding/useTransientLabel";

import styles from "../onboarding.module.css";

/**
 * A subscribe function for a value that never changes after the first render.
 * `useSyncExternalStore` requires one, so this returns an unsubscribe that has
 * nothing to undo. Declared at module scope so its identity is stable —
 * defining it inline would resubscribe on every render.
 */
const subscribeToNothing = () => () => {};

type DashboardStepProps = {
  state: OnboardingState;
  /** The claimed memoir, or null after a reload — see `useMe()` below. */
  memoir: MemoirSummary | null;
  onCollect: () => void;
  onOrganize: () => void;
};

export function DashboardStep({
  state,
  memoir,
  onCollect,
  onOrganize,
}: DashboardStepProps) {
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy link");
  const [shareLabel, showShareLabel] = useTransientLabel("Share on WhatsApp");
  const [reminderLabel, showReminderLabel] = useTransientLabel(
    "Send a reminder",
  );

  // Falls back to the server when the in-memory claim result is gone, which is
  // what happens on a reload. Newest memoir first, matching the backend's
  // ORDER BY created_at DESC.
  const { data: me, isPending } = useMe();
  const active = memoir ?? me?.memoirs[0] ?? null;

  // `window` does not exist while this is server-rendered, so the origin is
  // read as an external store: the server snapshot is "", the client snapshot
  // is the real origin, and React reconciles the two without a hydration
  // mismatch. The subscribe function is a no-op because an origin never
  // changes for the life of the page.
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  // The API returns the token alone and the frontend composes the URL — the
  // backend has no business knowing this domain, or a staging deploy would
  // hand out production links.
  const inviteUrl = active?.link_token
    ? `${origin}/j/${active.link_token}`
    : null;
  /** Same URL without the scheme, which is how the design displays it. */
  const inviteLabel = inviteUrl?.replace(/^https?:\/\//, "") ?? null;

  function copyLink() {
    if (!inviteUrl) return;
    const done = () => showCopyLabel("Copied", 1800);
    if (navigator.clipboard)
      navigator.clipboard.writeText(inviteUrl).then(done, done);
    else done();
  }

  return (
    <div className={`${styles.sheet} ${styles.step}`}>
      <div className={styles["dash-head"]}>
        <div className={styles.eyebrow}>
          {state.collected
            ? `${possessive(firstName(state.name))} memoir`
            : "Memoir saved"}
        </div>
        <h2>
          {state.collected
            ? "Four people have added memories."
            : "Now bring in the family."}
        </h2>
        <p>
          {state.collected
            ? "Nine were invited. You can send one reminder to the five who haven't opened it yet."
            : "One link, for everyone."}
        </p>
      </div>

      {state.collected && (
        <div className={styles.people}>
          {PEOPLE.map(([personName, relation, contribution, joined]) => (
            <div
              key={personName}
              className={`${styles.person} ${joined ? "" : styles.pending}`}
            >
              <span className={styles["person-n"]}>{personName}</span>
              <span className={styles["person-r"]}>{relation}</span>
              <span className={styles["person-c"]}>{contribution}</span>
            </div>
          ))}
          <div className={styles["person-more"]}>
            4 others invited, not opened
          </div>
        </div>
      )}

      {state.collected && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>23</div>
            <div className={styles["stat-l"]}>Memories</div>
          </div>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>31</div>
            <div className={styles["stat-l"]}>Photographs</div>
          </div>
          <div className={styles.stat}>
            <div className={styles["stat-n"]}>2h 14m</div>
            <div className={styles["stat-l"]}>Recorded</div>
          </div>
        </div>
      )}

      <div>
        <div className={styles.linklabel}>The link to share</div>
        <div className={styles.linkbox}>
          {/*
            Three states, and they are genuinely different: still loading,
            loaded with a live link, or loaded with none — which happens when
            the link has been revoked and not yet reissued.
          */}
          <code>
            {inviteLabel ??
              (isPending ? "Fetching your link…" : "No live link yet")}
          </code>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={copyLink}
            disabled={!inviteUrl}
          >
            {copyLabel}
          </button>
        </div>
        <div className={styles["share-row"]}>
          <button
            type="button"
            className={styles["btn-quiet"]}
            onClick={() => showShareLabel("Opens the share sheet", 1600)}
          >
            {shareLabel}
          </button>
        </div>
      </div>

      {state.collected && (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-text"]}`}
            onClick={() => showReminderLabel("Opens the share sheet", 1600)}
          >
            {reminderLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-primary"]}`}
            onClick={onOrganize}
          >
            Organize into chapters
          </button>
        </div>
      )}

      <div className={styles["dash-foot"]}>
        Private and unpublished. Nothing is locked until you publish it
        yourself.
      </div>
      {!state.collected && (
        <button type="button" className={styles.jump} onClick={onCollect}>
          Prototype · skip ahead four days →
        </button>
      )}
    </div>
  );
}
