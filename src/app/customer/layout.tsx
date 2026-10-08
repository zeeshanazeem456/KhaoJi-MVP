import { AppShell } from "@/components/AppShell";
import { CartProvider } from "@/components/Cart";
import { requireRole } from "@/lib/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("customer");
  return (
    <CartProvider>
      <AppShell role="customer" name={profile.full_name}>
        {children}
      </AppShell>
    </CartProvider>
  );
}
