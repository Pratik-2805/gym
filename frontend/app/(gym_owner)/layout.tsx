import React from 'react';
import { redirect } from 'next/navigation';
import { fetchBackend } from '@/lib/api-client';
import DashboardShell from '@/components/dashboard/DashboardShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  console.log("📂 [DashboardLayout] Awaiting auth/me fetch...");
  // Retrieve current user and gym details from Express Backend
  const res = await fetchBackend('/api/auth/me');
  console.log("📂 [DashboardLayout] auth/me status:", res.status);
  if (!res.ok) {
    console.log("📂 [DashboardLayout] Auth failed, redirecting to /login");
    redirect('/login');
  }

  const { user: activeUser } = await res.json();
  const gym = activeUser.gym;

  console.log("📂 [DashboardLayout] activeUser:", JSON.stringify(activeUser));
  console.log("📂 [DashboardLayout] gym:", JSON.stringify(gym));

  // Enforce tenant scoping and access check
  if (!gym && activeUser.role !== 'SUPERADMIN') {
    console.log("📂 [DashboardLayout] User has no gym, redirecting to /login");
    redirect('/login');
  }

  return (
    <DashboardShell gym={gym} activeUser={activeUser}>
      {children}
    </DashboardShell>
  );
}
