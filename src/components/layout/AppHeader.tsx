"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Wordmark } from "@/components/layout/Wordmark";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  /**
   * Match the path exactly instead of by prefix.
   *
   * Archive needs it because `/archive/new` is its own item in this nav —
   * without it both would light up at once and neither would tell you where
   * you are.
   */
  exact?: boolean;
};

/** The four places a signed-in owner can go. */
const NAV: NavItem[] = [
  { href: "/archive", label: "Archive", exact: true },
  { href: "/archive/new", label: "New memory" },
  { href: "/contributors", label: "Contributors" },
  { href: "/billing", label: "Billing" },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Two letters for the avatar.
 *
 * Prefers the name given at signup; falls back to the email local part, so a
 * Google account with no `full_name` still gets something readable rather than
 * an empty circle. A one-word name gives one letter — "S" is honest, "SS"
 * would be invented.
 */
function initialsFrom(fullName: string, email: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1) return words[0][0].toUpperCase();

  const local = email.split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase();
}

function NavLinks({ pathname }: { pathname: string }) {
  return NAV.map((item) => {
    const active = isActive(item, pathname);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "font-sans text-sm whitespace-nowrap transition-colors",
          active ? "text-seal" : "text-ink-soft hover:text-foreground",
        )}
      >
        {item.label}
      </Link>
    );
  });
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSupabaseSession();

  const user = session?.user;
  const metadata = user?.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;
  const initials = user
    ? initialsFrom(metadata?.full_name ?? metadata?.name ?? "", user.email ?? "")
    : "";

  async function signOut() {
    await supabase.auth.signOut();

    /*
      Empty the query cache before leaving, and this is not housekeeping.

      Supabase clears the session, but TanStack Query still holds the answer to
      `GET /me` — including the memoir. Onboarding's landing guard reads that
      cache to decide whether someone already has a memoir, so it would see one,
      redirect to /archive, find no session, redirect back to /onboarding, and
      bounce between the two forever. Signing out looked like an infinite loop.

      It is also the right thing on its own terms: the next person to sign in on
      this browser must not inherit the last one's archive from a stale cache.
    */
    queryClient.clear();
    router.push("/onboarding");
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-6 px-6">
        <Wordmark href="/archive" />

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <NavLinks pathname={pathname} />
        </nav>

        {/*
          The avatar is a sign-out control, not a menu. There is exactly one
          thing to do here today, and a dropdown holding a single item is a
          click tax. It becomes a menu when there is a second item.
        */}
        {initials ? (
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-[11px] font-medium tracking-wide text-paper transition-colors hover:bg-seal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="sr-only">Sign out</span>
            <span aria-hidden>{initials}</span>
          </button>
        ) : (
          // Holds the space while the session loads, so the row does not jump.
          <span className="size-8 shrink-0" aria-hidden />
        )}
      </div>

      {/*
        On narrow screens the nav moves below the wordmark rather than behind a
        hamburger. This audience should not have to find an icon to navigate.
      */}
      <nav
        aria-label="Main"
        className="flex items-center justify-center gap-6 overflow-x-auto border-t border-border px-6 py-3 md:hidden"
      >
        <NavLinks pathname={pathname} />
      </nav>
    </header>
  );
}
