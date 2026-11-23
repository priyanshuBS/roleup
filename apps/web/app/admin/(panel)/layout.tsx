import type { Metadata } from 'next';
import { LogOut, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { logout } from '../actions';
import { AdminNav } from '../AdminNav';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border pb-5">
        <span className="inline-flex items-center gap-2 font-semibold">
          <span className="icon-tile !h-8 !w-8 !rounded-sm">
            <ShieldCheck size={16} aria-hidden />
          </span>
          Admin
        </span>
        <AdminNav />
        <form action={logout} className="ml-auto">
          <button type="submit" className="btn btn-sm">
            <LogOut size={14} aria-hidden /> Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
