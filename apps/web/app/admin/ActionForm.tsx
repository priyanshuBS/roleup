'use client';

import { useActionState } from 'react';
import type { ActionState } from './actions';

/** Form bound to a server action that returns { ok } / { error }. */
export function ActionForm({
  action,
  children,
  className,
  submitLabel = 'Save',
  extraButtons,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
  extraButtons?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        {extraButtons}
        <span role="status" aria-live="polite" className="text-sm">
          {state?.error && <span className="text-danger">{state.error}</span>}
          {state?.ok && <span className="text-success">{state.ok}</span>}
        </span>
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
  required,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const id = `${name}-${Math.abs(hash(String(defaultValue ?? '') + name))}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-text-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className="field"
      />
    </div>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
