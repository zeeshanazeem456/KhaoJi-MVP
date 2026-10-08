import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";

export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("rider");
  return (
    <AppShell role="rider" name={profile.full_name}>
      {children}
    </AppShell>
  );
}
