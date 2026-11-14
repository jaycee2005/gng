"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, MouseEvent } from "react";
import { Button } from "./button";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "isLoading"> & {
  /** When set, asks the user to confirm before the form is submitted. */
  confirm?: string;
  /** Label shown while the server action is running. */
  pendingLabel?: string;
};

/**
 * Submit button for Server Action forms: shows a spinner and disables itself
 * while the action runs, and can guard destructive actions with a confirm step.
 */
export function SubmitButton({ confirm, pendingLabel, onClick, children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (confirm && !window.confirm(confirm)) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <Button type="submit" isLoading={pending} aria-busy={pending} onClick={handleClick} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

