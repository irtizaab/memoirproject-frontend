import { cn } from "@/lib/utils";

/**
 * A square icon button with a real accessible name.
 *
 * Here rather than in a feature folder because two features had grown their
 * own identical copy — `PlanOutline` reorders chapters with it and
 * `PageEditor` reorders passages — and a cross-feature import is forbidden, so
 * the third copy was the only way to keep going. It knows nothing about
 * memoirs, which is what makes `components/ui/` the right home.
 *
 * `label` is required and does two jobs: the accessible name and the tooltip.
 * An icon button without one is a button that only sighted mouse users can
 * identify, and this product's controls are mostly arrows and crosses.
 */
export function IconButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-ink-soft transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
    >
      {children}
    </button>
  );
}
