/**
 * The line at the bottom of every signed-in screen.
 *
 * A server component — it holds no state and takes no interaction, so there is
 * no reason to ship it to the browser.
 */
export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-6 font-sans text-xs text-ink-faint">
        <span>A quieter place for the stories that made you.</span>
        {/*
          Safe to read the clock here only because this is a server component:
          the year is resolved once during rendering and arrives as HTML. The
          same line in a client component would be a hydration mismatch waiting
          for midnight on 31 December.
        */}
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
