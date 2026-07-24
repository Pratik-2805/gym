import React from 'react';
import { redirect } from 'next/navigation';
import { fetchBackend } from '@/lib/api-client';
import DashboardShell from '@/components/dashboard/DashboardShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const params = await props.params;
  const { children } = props;

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
  console.log("📂 [DashboardLayout] params.gymSlug:", params.gymSlug);

  // Enforce tenant scoping and access check
  const decodedGymSlug = decodeURIComponent(params.gymSlug).toLowerCase();
  console.log("📂 [DashboardLayout] decodedGymSlug:", decodedGymSlug);
  if (!gym || (activeUser.role !== 'SUPERADMIN' && gym.slug.toLowerCase() !== decodedGymSlug)) {
    console.log("📂 [DashboardLayout] Scoping failed! gym.slug:", gym?.slug, "decodedGymSlug:", decodedGymSlug, "redirecting to /login");
    redirect('/login');
  }

  return (
    <DashboardShell gym={gym} activeUser={activeUser} gymSlug={params.gymSlug}>
      {children}
    </DashboardShell>
  );
}
