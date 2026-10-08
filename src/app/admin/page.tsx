"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull, OrderStatus, Profile } from "@/lib/types";
import { ORDER_SELECT, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, pkr, STATUS_LABEL, timeAgo } from "@/lib/format";
import { useLiveOrders } from "@/hooks/useLiveOrders";
import { useOrderAction } from "@/hooks/useOrderAction";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderItemsList } from "@/components/OrderItemsList";

const FILTERS: { id: string; label: string; statuses?: OrderStatus[] }[] = [
  { id: "active", label: "Active", statuses: ["placed", "accepted", "preparing", "ready", "picked_up"] },
  { id: "attention", label: "Needs attention" },
  { id: "delivered", label: "Delivered", statuses: ["delivered"] },
  { id: "closed", label: "Rejected / cancelled", statuses: ["rejected", "cancelled"] },
  { id: "all", label: "All" },
];

const STUCK_MIN = 10;

/** An order needs attention if it sits too long without the next step, or a refund is due. */
function needsAttention(o: OrderFull) {
  const mins = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0);
  if (o.payment_status === "refund_pending") return "Refund due";
  if (o.status === "placed" && mins(o.created_at) > STUCK_MIN) return `Not accepted for ${STUCK_MIN}+ min`;
  if (o.status === "ready" && !o.rider_id && mins(o.ready_at) > 5) return "Ready, no rider";
  if ((o.status === "preparing" || o.status === "ready") && !o.rider_id && mins(o.created_at) > 20) return "No rider yet";
  return null;
}

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState("active");
  const [riders, setRiders] = useState<Profile[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from("orders")
      .select(ORDER_SELECT)
      .neq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data as OrderFull[]) ?? [];
  }, []);
  const { orders, refresh } = useLiveOrders("admin", load, { pollMs: 15000 });
  const { run, busy } = useOrderAction(refresh);

  useEffect(() => {
    supabaseBrowser()
      .from("profiles")
      .select("*")
      .eq("role", "rider")
      .eq("status", "approved")
      .order("is_online", { ascending: false })
      .then(({ data }) => setRiders((data as Profile[]) ?? []));
  }, []);

  const f = FILTERS.find((x) => x.id === filter)!;
  const shown = orders.filter((o) =>
    filter === "attention" ? needsAttention(o) : f.statuses ? f.statuses.includes(o.status) : true
  );
  const attentionCount = orders.filter(needsAttention).length;

  return (
    <div>
      <h1 className="mb-4 h-sign text-[36px]">All orders</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            onClick={() => setFilter(x.id)}
            className={`btn-sm btn ${filter === x.id ? "bg-chai text-white" : "border-2 border-chai-line bg-white"}`}
          >
            {x.label}
            {x.id === "attention" && attentionCount > 0 && <span className="chip bg-chili text-white">{attentionCount}</span>}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-chai-line">
        {shown.length === 0 && <p className="p-6 text-center text-sm text-chai-muted">No orders here.</p>}
        {shown.map((o) => {
          const warn = needsAttention(o);
          const expanded = open === o.id;
          return (
            <div key={o.id} className={warn ? "bg-chili-light/40" : ""}>
              <button className="grid w-full grid-cols-2 gap-2 p-4 text-left text-sm md:grid-cols-[70px_1.3fr_1fr_1fr_110px_120px]" onClick={() => setOpen(expanded ? null : o.id)}>
                <span className="font-black">#{o.order_no}</span>
                <span>
                  <b>{o.restaurant?.name}</b>
                  <span className="block text-xs text-chai-muted">{o.customer?.full_name} → {o.drop_point?.name}</span>
                </span>
                <span className="text-xs text-chai-muted">
                  Rider: {o.rider?.full_name ?? "—"}
                  <span className="block">{timeAgo(o.created_at)}</span>
                </span>
                <span className="text-xs">
                  {PAYMENT_LABEL[o.payment_method]}
                  <span className="block text-chai-muted">{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                </span>
                <span className="font-semibold">{pkr(o.total)}</span>
                <span className="flex flex-col items-start gap-1">
                  <StatusBadge status={o.status} />
                  {warn && <span className="text-[11px] font-semibold text-chili">{warn}</span>}
                </span>
              </button>

              {expanded && (
                <div className="grid gap-4 border-t border-chai-line bg-haldi-light/40 p-4 md:grid-cols-2">
                  <OrderItemsList order={o} />
                  <div className="space-y-3 text-sm">
                    <p className="text-chai-muted">
                      Commission {o.commission_rate}% = <b className="text-ink">{pkr(o.commission_amount)}</b>
                      {o.reject_reason && <span className="block">Reject reason: {o.reject_reason}</span>}
                    </p>
                    {!o.rider_id && ["accepted", "preparing", "ready"].includes(o.status) && (
                      <div>
                        <label className="label">Assign a rider</label>
                        <select
                          className="input"
                          defaultValue=""
                          onChange={(e) => e.target.value && run(o.id, "assign_rider", { rider_id: e.target.value }, "Rider assigned")}
                        >
                          <option value="">Choose rider…</option>
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.full_name} {r.is_online ? "(online)" : "(offline)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!["delivered", "cancelled", "rejected"].includes(o.status) && (
                        <button
                          className="btn-danger btn-sm"
                          disabled={!!busy}
                          onClick={() => window.confirm(`Cancel order #${o.order_no}?`) && run(o.id, "cancel", {}, "Order cancelled")}
                        >
                          Cancel order
                        </button>
                      )}
                      {o.payment_status === "refund_pending" && (
                        <button className="btn-secondary btn-sm" disabled={!!busy} onClick={() => run(o.id, "refund", {}, "Marked as refunded")}>
                          Mark refunded
                        </button>
                      )}
                      {o.status !== "delivered" && o.status !== "cancelled" && o.status !== "rejected" && (
                        <span className="self-center text-xs text-chai-muted">Now: {STATUS_LABEL[o.status]}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
