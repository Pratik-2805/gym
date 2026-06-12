import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: Promise<{ gymSlug: string }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const params = await props.params;
  redirect(`/dashboard/${params.gymSlug}/members`);
}
