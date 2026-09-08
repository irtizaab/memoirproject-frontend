"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";

import { Wordmark } from "@/components/layout/Wordmark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** The three palette choices, in the order the menu shows them. */
const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

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
  const { theme, setTheme } = useTheme();

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
          The avatar was a sign-out button for as long as signing out was the
          only thing to do here, on the grounds that a dropdown holding one item
          is a click tax. Appearance is the second item, so it is a menu now —
          which is what the note that used to sit here said would happen.
        */}
        {initials ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account and appearance"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-[11px] font-medium tracking-wide text-paper transition-colors hover:bg-seal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span aria-hidden>{initials}</span>
                </button>
              }
            />

            <DropdownMenuContent align="end" className="w-56">
              {user?.email && (
                <>
                  {/*
                    A plain div, not `DropdownMenuLabel`. That component is Base
                    UI's `Menu.GroupLabel`, which exists to put its id on a
                    group's `aria-labelledby` and throws when there is no group
                    above it. This line labels nothing — it is who you are
                    signed in as — so it has no group to belong to. Same
                    `role="presentation"` and the same classes as the component
                    rendered, so the DOM is unchanged.
                  */}
                  <div
                    role="presentation"
                    className="truncate px-1.5 py-1 text-xs font-normal text-ink-faint"
                  >
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}

              {/*
                Three options, not a switch. "System" is a real answer and the
                default one — it means "follow this machine, including when it
                changes at sunset" — and a two-state toggle has nowhere to put
                it.
              */}
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as Theme)}
              >
                {/*
                  Inside the radio group, not above it. `Menu.RadioGroup` is one
                  of the two components that provide the context `GroupLabel`
                  reads, and being in it is also what makes this heading the
                  group's `aria-labelledby` rather than a floating word.
                */}
                <DropdownMenuLabel className="eyebrow-muted">
                  Appearance
                </DropdownMenuLabel>
                {THEMES.map(({ value, label, Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon aria-hidden className="mr-2 size-4 text-ink-soft" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={signOut}>
                <LogOut aria-hidden className="mr-2 size-4 text-ink-soft" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
