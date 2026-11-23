import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { logout } from '../actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-border pb-3">
        <span className="font-semibold">Admin</span>
        <nav aria-label="Admin" className="flex gap-3 text-sm">
          <Link href="/admin" className="link">
            Overview
          </Link>
          <Link href="/admin/analytics" className="link">
            Analytics
          </Link>
          <Link href="/admin/funding" className="link">
            Funding queue
          </Link>
          <Link href="/admin/companies" className="link">
            Companies
          </Link>
        </nav>
        <form action={logout} className="ml-auto">
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
