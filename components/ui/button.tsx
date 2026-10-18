import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const styles = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-medium transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)] disabled:pointer-events-none disabled:opacity-50 [&_kbd]:ml-1",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
        outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]",
        destructive: "bg-[var(--destructive)] text-[var(--primary-foreground)] hover:opacity-90",
        ghost: "bg-transparent hover:bg-[var(--muted)]",
        link: "bg-transparent underline-offset-4 hover:underline",
      },
      size: {
        // Thumbs need 44px; pointer targets stay compact from sm up.
        default: "h-9 min-h-11 px-4 sm:min-h-9",
        sm: "h-8 min-h-11 px-3 text-[13px] sm:min-h-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, ...props }, ref) {
  return <button ref={ref} className={cn(styles({ variant, size }), className)} {...props} />;
});
