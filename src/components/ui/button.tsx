import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Restyled from the shadcn default onto the memoir palette.
 *
 * Sentence case throughout — "Save memory", "Manage plan", "Invite
 * contributor". Colours come from the theme tokens rather than being written
 * here, so `--seal` remains the single place the accent is chosen. The `dark:`
 * branches are gone, and that is not because there is no dark theme — there
 * is. It is ten re-picked values in `globals.css` and nothing else, so a
 * button written against the tokens is already correct in both.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding rounded-lg font-sans text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** The seal. One per screen — the thing you came to the page to do. */
        default: "bg-primary text-primary-foreground hover:bg-seal-dark",
        /** Hairline on paper: "Invite contributor" in the archive banner. */
        outline:
          "border-border bg-background text-foreground hover:bg-paper-deep",
        secondary: "bg-secondary text-secondary-foreground hover:bg-paper-deep",
        ghost: "text-ink-soft hover:bg-paper-deep hover:text-foreground",
        /** Deleting a memory. Quiet until hovered — never a red button. */
        destructive: "text-ink-faint hover:bg-seal-wash hover:text-seal",
        link: "text-foreground underline-offset-4 hover:text-seal hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3 text-[0.8rem]",
        lg: "h-11 px-6",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
