"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium text-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-hover)] focus-visible:ring-[var(--color-accent)]",
        secondary:
          "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[#E4E1DA] focus-visible:ring-[var(--color-ring)]",
        destructive:
          "bg-[var(--color-destructive)] text-[var(--color-on-destructive)] hover:bg-[#8E2828] focus-visible:ring-[var(--color-destructive)]",
        outline:
          "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]",
        ghost:
          "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]",
        link: "bg-transparent text-[var(--color-accent)] underline-offset-4 hover:underline p-0 h-auto focus-visible:ring-[var(--color-accent)]",
      },
      size: {
        sm: "min-h-10 sm:min-h-8 px-3 text-xs rounded-md",
        md: "min-h-11 sm:min-h-9 px-4 text-sm rounded-[var(--button-radius)]",
        lg: "min-h-12 px-6 text-base rounded-[var(--button-radius)]",
        icon: "min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 rounded-[var(--button-radius)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
