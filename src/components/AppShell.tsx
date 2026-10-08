"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike, LayoutDashboard, LogOut, Receipt, Settings, Store, Users, UtensilsCrossed, Wallet, type LucideIcon,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { TruckBand } from "./TruckBand";
import { Wordmark } from "./Wordmark";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  customer: [
    { href: "/customer", label: "Food", icon: Store },
    { href: "/customer/orders", label: "My orders", icon: Receipt },
  ],
  restaurant: [
    { href: "/restaurant", label: "Orders", icon: Receipt },
    { href: "/restaurant/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/restaurant/earnings", label: "Earnings", icon: Wallet },
  ],
  rider: [
    { href: "/rider", label: "Deliveries", icon: Bike },
    { href: "/rider/earnings", label: "Earnings", icon: Wallet },
  ],
  admin: [
    { href: "/admin", label: "Orders", icon: Receipt },
    { href: "/admin/partners", label: "Partners", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ],
};

const ROLE_TAG: Record<Role, string | null> = {
  customer: null,
  restaurant: "for restaurants",
  rider: "for riders",
  admin: "admin",
};

export function AppShell({
  role,
  name,
  wide = false,
  children,
}: {
  role: Role;
  name: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const width = wide ? "max-w-6xl" : "max-w-xl";
  const active = (href: string) => (href === `/${role}` ? path === href : path.startsWith(href));

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <header className="sticky top-0 z-30">
        <div className="bg-chili text-white">
          <div className={`mx-auto flex ${width} items-center justify-between gap-3 px-4 py-2.5`}>
            <Link href="/" className="flex items-baseline gap-2 rounded-lg">
              <Wordmark className="text-[22px]" />
              {ROLE_TAG[role] && <span className="text-sm font-medium text-white/85">{ROLE_TAG[role]}</span>}
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              {NAV[role].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
                    active(n.href) ? "bg-white text-chili" : "text-white/90 hover:bg-white/15"
                  }`}
                >
                  <n.icon size={16} aria-hidden />
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-white/85 md:inline">{name}</span>
              <button
                onClick={logout}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
              >
                <LogOut size={19} aria-hidden />
              </button>
            </div>
          </div>
        </div>
        <TruckBand height={10} />
      </header>

      <main className={`mx-auto ${width} px-4 py-5`}>{children}</main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-chai-line bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {NAV[role].map((n) => {
          const on = active(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${on ? "text-chili" : "text-chai-muted"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${on ? "bg-chili-light" : ""}`}>
                <n.icon size={20} aria-hidden />
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
