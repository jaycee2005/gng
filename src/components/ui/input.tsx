"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--color-foreground)]"
          >
            {label}
            {props.required && <span className="text-[var(--color-destructive)] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full min-h-11 sm:min-h-9 px-3 text-base sm:text-sm bg-[var(--input-bg)] text-[var(--color-foreground)] border rounded-[var(--input-radius)] transition-colors duration-150",
            "placeholder:text-[var(--color-muted-foreground)]/75",
            "focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-transparent",
            "disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed",
            error
              ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
              : "border-[var(--input-border)] hover:border-[#CFCBBE]",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--color-muted-foreground)]">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-destructive)] flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6.25a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-[var(--color-foreground)]"
          >
            {label}
            {props.required && <span className="text-[var(--color-destructive)] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full min-h-[88px] px-3 py-2 text-base sm:text-sm bg-[var(--input-bg)] text-[var(--color-foreground)] border rounded-[var(--input-radius)] transition-colors duration-150 resize-y",
            "placeholder:text-[var(--color-muted-foreground)]/75",
            "focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-transparent",
            "disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed",
            error
              ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
              : "border-[var(--input-border)] hover:border-[#CFCBBE]",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--color-muted-foreground)]">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="space-y-1.5 min-w-0">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-[var(--color-foreground)]"
          >
            {label}
            {props.required && <span className="text-[var(--color-destructive)] ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full min-h-11 sm:min-h-9 px-3 text-base sm:text-sm bg-[var(--input-bg)] text-[var(--color-foreground)] border rounded-[var(--input-radius)] transition-colors duration-150 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-transparent",
            "disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed",
            error
              ? "border-[var(--color-destructive)]"
              : "border-[var(--input-border)] hover:border-[#CFCBBE]",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-destructive)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Input, Textarea, Select };
