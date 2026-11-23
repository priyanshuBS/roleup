import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
    <div className="max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      {adminEnabled() ? (
        <LoginForm />
      ) : (
        <p className="mt-2 text-text-muted">
          Admin is disabled. Set ADMIN_TOKEN (16+ characters) to enable it.
        </p>
      )}
    </div>
  );
}
