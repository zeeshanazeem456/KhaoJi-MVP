"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { pkr } from "@/lib/format";
import { StatTile } from "@/components/StatTile";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    supabaseBrowser()
      .from("orders")
      .select("*")
      .gte("created_at", since.toISOString())
      .neq("status", "pending_payment")
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, []);

  if (!orders) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  const delivered = orders.filter((o) => o.status === "delivered");
  const today = new Date().toDateString();
  const todayDelivered = delivered.filter((o) => new Date(o.created_at).toDateString() === today);
  const gmv = delivered.reduce((s, o) => s + o.total, 0);
  const commission = delivered.reduce((s, o) => s + o.commission_amount, 0);
  const fees = delivered.reduce((s, o) => s + o.delivery_fee, 0);
  const times = delivered
    .filter((o) => o.delivered_at)
    .map((o) => (new Date(o.delivered_at!).getTime() - new Date(o.created_at).getTime()) / 60000);
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const cod = delivered.filter((o) => o.payment_method === "cod").length;
  const failed = orders.filter((o) => o.status === "rejected" || o.status === "cancelled").length;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const list = orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString());
    const del = list.filter((o) => o.status === "delivered");
    return {
      label: d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric" }),
      orders: list.length,
      delivered: del.length,
      gmv: del.reduce((s, o) => s + o.total, 0),
      commission: del.reduce((s, o) => s + o.commission_amount, 0),
    };
  });
  const maxOrders = Math.max(1, ...days.map((d) => d.orders));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h-sign text-[36px]">Dashboard</h1>
        <p className="text-sm text-chai-muted">Last 7 days</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Delivered today" value={String(todayDelivered.length)} tone="haldi" />
        <StatTile label="Order value (GMV)" value={pkr(gmv)} hint={`${delivered.length} delivered orders`} />
        <StatTile label="KhaoJi revenue" value={pkr(commission + fees)} hint={`${pkr(commission)} commission + ${pkr(fees)} delivery fees`} />
        <StatTile label="Avg. delivery time" value={avgTime ? `${avgTime} min` : "—"} hint="Order placed → delivered" />
        <StatTile label="Cash on delivery" value={delivered.length ? `${Math.round((cod / delivered.length) * 100)}%` : "—"} hint="Share of delivered orders" />
        <StatTile label="Rejected / cancelled" value={String(failed)} hint={orders.length ? `${Math.round((failed / orders.length) * 100)}% of all orders` : undefined} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-chai-muted">
            <tr className="border-b border-chai-line">
              <th className="p-3">Day</th>
              <th className="w-1/3 p-3">Orders</th>
              <th className="p-3 text-right">Delivered</th>
              <th className="p-3 text-right">GMV</th>
              <th className="p-3 text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.label} className="border-b border-chai-line last:border-0">
                <td className="p-3 font-semibold">{d.label}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${(d.orders / maxOrders) * 100}%`, minWidth: d.orders ? 4 : 0 }} />
                    <span className="text-xs text-chai-muted">{d.orders}</span>
                  </div>
                </td>
                <td className="p-3 text-right">{d.delivered}</td>
                <td className="p-3 text-right">{pkr(d.gmv)}</td>
                <td className="p-3 text-right font-bold">{pkr(d.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
