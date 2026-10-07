import { useId, type ReactElement, type ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';
import { Label } from './label';

interface FormFieldProps {
  label: string;
  required?: boolean;
  /** Validation error — when set, wires `aria-invalid`/`aria-describedby` onto the child field and renders the message below it. */
  error?: string;
  /** Helper text shown when there is no error. */
  hint?: string;
  id?: string;
  className?: string;
  /** The field control itself — `Input`, `Select`, `Textarea`, or any element accepting `id`/`aria-describedby`/`aria-invalid`. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; invalid?: boolean }>;
}

/**
 * Wires a `Label` to its field via `htmlFor`/`id`, and a validation error to
 * the field via `aria-describedby`/`aria-invalid` — the pairing the Phase 86
 * UX audit found missing on all but 17 of ~189 labels repo-wide. Takes the
 * field as `children` (rather than rendering its own `<input>`) so it works
 * with `Input`, `Select`, `Textarea`, or a custom control equally.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  id,
  className = '',
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedById = error || hint ? `${fieldId}-description` : undefined;

  const field = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedById,
        invalid: Boolean(error),
      })
    : children;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      {field}
      {describedById && (
        <p
          id={describedById}
          className={`text-[11px] ${error ? 'text-[#fda4af]' : 'text-[#87948b]'}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function FieldGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`flex flex-col gap-4 ${className}`}>{children}</div>;
}
