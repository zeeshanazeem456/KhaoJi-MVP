"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RiderEarning } from "@/lib/types";
import { pkr } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import { StatTile } from "@/components/StatTile";
import { Empty } from "@/components/Empty";

type Row = RiderEarning & { order: { order_no: number; restaurant: { name: string } | null } | null };

export default function RiderEarningsPage() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    supabaseBrowser()
      .from("rider_earnings")
      .select("*, order:orders(order_no, restaurant:restaurants(name))")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  if (!rows) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  const today = new Date().toDateString();
  const todays = rows.filter((r) => new Date(r.created_at).toDateString() === today);
  const total = (l: Row[]) => l.reduce((s, r) => s + r.base_pay + r.bonus, 0);
  const bonuses = rows.reduce((s, r) => s + r.bonus, 0);
  const cash = todays.reduce((s, r) => s + r.cash_collected, 0);
  const toTarget = settings ? Math.max(0, settings.daily_target - todays.length) : 0;

  return (
    <div className="space-y-5">
      <h1 className="h-sign text-[36px]">Earnings</h1>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Today" value={pkr(total(todays))} hint={`${todays.length} deliveries`} tone="haldi" />
        <StatTile label="Last 7 days" value={pkr(total(rows))} hint={`${rows.length} deliveries`} />
        <StatTile label="Bonuses (7 days)" value={pkr(bonuses)} />
        <StatTile label="Cash to hand in today" value={pkr(cash)} hint="COD collected for KhaoJi" />
      </div>

      {settings && (
        <div className="card p-4">
          <p className="text-sm font-bold">Daily target bonus</p>
          <p className="text-sm text-chai-muted">
            {toTarget > 0
              ? `${toTarget} more deliveries today to earn +${pkr(settings.daily_target_bonus)}`
              : `Target reached! +${pkr(settings.daily_target_bonus)} earned`}
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-chai-line">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, (todays.length / settings.daily_target) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty title="No deliveries yet this week" />
      ) : (
        <div className="card divide-y divide-chai-line">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold">
                  #{r.order?.order_no} · {r.order?.restaurant?.name}
                </p>
                <p className="text-xs text-chai-muted">
                  {new Date(r.created_at).toLocaleString("en-PK", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                  {r.bonus_reason && <span className="ml-1 font-semibold text-patti">· {r.bonus_reason}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black">{pkr(r.base_pay + r.bonus)}</p>
                {r.bonus > 0 && <p className="text-xs text-patti">incl. +{pkr(r.bonus)} bonus</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
