import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "ui-button-solid bg-[var(--foreground)] text-[var(--canvas)] hover:bg-[var(--accent)] hover:text-white",
        outline: "ui-button-outline border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        ghost: "ui-button-ghost bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        danger: "ui-button-danger bg-[var(--danger)] text-white hover:brightness-110",
      },
      size: {
        default: "ui-button-default min-h-[42px] px-[15px]",
        icon: "ui-button-icon size-[42px] p-0",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className = "",
  variant = "ghost",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
