import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("restaurant");
  return (
    <AppShell role="restaurant" name={profile.full_name} wide>
      {children}
    </AppShell>
  );
}
