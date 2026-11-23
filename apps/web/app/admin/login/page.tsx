import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { adminEnabled, isAdmin } from '@/lib/admin-auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <div className="mx-auto max-w-sm py-10 sm:py-16">
      <div className="card p-6 sm:p-8">
        <span className="icon-tile icon-tile-lg">
          <Lock size={20} aria-hidden />
        </span>
        <h1 className="display mt-5 text-2xl">Admin sign in</h1>
        {adminEnabled() ? (
          <>
            <p className="mt-1 text-sm text-text-muted">Enter the admin token to continue.</p>
            <LoginForm />
          </>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Admin is disabled. Set ADMIN_TOKEN (16+ characters) to enable it.
          </p>
        )}
      </div>
    </div>
  );
}
