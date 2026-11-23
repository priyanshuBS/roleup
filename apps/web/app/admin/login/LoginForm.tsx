'use client';

import { useActionState } from 'react';
import { login } from '../actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label htmlFor="token" className="mb-1 block text-xs font-medium text-text-muted">
          Admin token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Checking…' : 'Sign in'}
      </button>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
