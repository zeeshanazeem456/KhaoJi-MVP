"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { pkr } from "@/lib/format";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { StatTile } from "@/components/StatTile";

/** Typical commission on big platforms, used only for the comparison line. Adjust as needed. */
const MARKET_RATE = 25;

export default function RestaurantEarningsPage() {
  const { restaurant } = useMyRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!restaurant) return;
    const since = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    supabaseBrowser()
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "delivered")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [restaurant]);

  if (!restaurant) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  const today = new Date().toDateString();
  const sum = (list: Order[]) => ({
    sales: list.reduce((s, o) => s + o.subtotal, 0),
    commission: list.reduce((s, o) => s + o.commission_amount, 0),
  });
  const t = sum(orders.filter((o) => new Date(o.created_at).toDateString() === today));
  const w = sum(orders);
  const savedVsMarket = Math.round((w.sales * MARKET_RATE) / 100) - w.commission;

  // Last 7 days, per day
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const list = orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString());
    return { label: d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }), count: list.length, ...sum(list) };
  });

  return (
    <div>
      <h1 className="mb-1 h-sign text-[36px]">Earnings</h1>
      <p className="mb-5 text-sm text-chai-muted">
        Your KhaoJi commission is <b className="text-brand">{restaurant.commission_rate}%</b>. Payouts are weekly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sales today" value={pkr(t.sales)} />
        <StatTile label="Net payout today" value={pkr(t.sales - t.commission)} hint={`Commission ${pkr(t.commission)}`} />
        <StatTile label="Sales (7 days)" value={pkr(w.sales)} hint={`${orders.length} orders`} />
        <StatTile label="You kept vs a 25% app" value={pkr(Math.max(0, savedVsMarket))} hint="Extra money in your pocket this week" tone="haldi" />
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-chai-muted">
            <tr className="border-b border-chai-line">
              <th className="p-3">Day</th>
              <th className="p-3 text-right">Orders</th>
              <th className="p-3 text-right">Sales</th>
              <th className="p-3 text-right">Commission</th>
              <th className="p-3 text-right">Net payout</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.label} className="border-b border-chai-line last:border-0">
                <td className="p-3 font-semibold">{d.label}</td>
                <td className="p-3 text-right">{d.count}</td>
                <td className="p-3 text-right">{pkr(d.sales)}</td>
                <td className="p-3 text-right text-chai-muted">{pkr(d.commission)}</td>
                <td className="p-3 text-right font-bold">{pkr(d.sales - d.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
