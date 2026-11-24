import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cx } from "@/components/ui";

export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  required,
  highlight,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  required?: boolean;
  highlight?: ReactNode;
}) {
  return (
    <div className={cx("min-w-0", Boolean(highlight) && "rounded-lg bg-amber-50 p-3 ring-2 ring-amber-400")} data-field={id}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      {highlight ? (
        <p className="mt-1 text-sm font-medium text-amber-900">
          <span className="font-bold">Officer request: </span>
          {highlight}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "block w-full min-h-11 rounded-lg border bg-white px-3 py-2 text-base text-ink shadow-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-surface";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        aria-invalid={invalid || undefined}
        className={cx(control, invalid ? "border-red-500" : "border-line", className)}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, children, ...props }, ref) {
    return (
      <select ref={ref} {...props} aria-invalid={invalid || undefined} className={cx(control, invalid ? "border-red-500" : "border-line", className)}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={3}
        {...props}
        aria-invalid={invalid || undefined}
        className={cx(control, invalid ? "border-red-500" : "border-line", className)}
      />
    );
  },
);
