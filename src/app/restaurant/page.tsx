"use client";
import { useCallback, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull } from "@/lib/types";
import { errMsg, ORDER_SELECT, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, pkr, timeAgo } from "@/lib/format";
import { Bike, CookingPot, Inbox, MapPin, PackageCheck, Timer } from "lucide-react";
import { beep, useLiveOrders } from "@/hooks/useLiveOrders";
import { useOrderAction } from "@/hooks/useOrderAction";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { OrderItemsList } from "@/components/OrderItemsList";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";

const PREP_TIMES = [10, 15, 20, 30];
const REJECT_REASONS = ["Item out of stock", "Too busy right now", "Closing soon"];

export default function RestaurantOrdersPage() {
  const toast = useToast();
  const { restaurant, setRestaurant } = useMyRestaurant();
  const rid = restaurant?.id;

  const load = useCallback(async () => {
    if (!rid) return [];
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { data } = await supabaseBrowser()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", rid)
      .or(`status.in.(placed,accepted,preparing,ready,picked_up),created_at.gte."${since.toISOString()}"`)
      .order("created_at", { ascending: true });
    return (data as OrderFull[]) ?? [];
  }, [rid]);

  const { orders, refresh } = useLiveOrders(`rest-${rid}`, load, {
    filter: rid ? `restaurant_id=eq.${rid}` : undefined,
    enabled: !!rid,
    onNew: (o) => {
      if (o.status === "placed") {
        beep();
        toast(`New order #${o.order_no}!`, "info");
      }
    },
  });
  const { run, busy } = useOrderAction(refresh);

  async function toggleOpen() {
    if (!restaurant) return;
    const { error } = await supabaseBrowser()
      .from("restaurants")
      .update({ is_open: !restaurant.is_open })
      .eq("id", restaurant.id);
    if (error) return toast(errMsg(error), "error");
    setRestaurant({ ...restaurant, is_open: !restaurant.is_open });
  }

  const cols = [
    { title: "New orders", icon: Inbox, empty: "New orders appear here with a beep.", list: orders.filter((o) => o.status === "placed") },
    { title: "In the kitchen", icon: CookingPot, empty: "Accepted orders move here.", list: orders.filter((o) => o.status === "accepted" || o.status === "preparing") },
    { title: "Packed and out", icon: PackageCheck, empty: "Orders waiting for or with a rider.", list: orders.filter((o) => o.status === "ready" || o.status === "picked_up") },
  ];
  const doneToday = orders.filter((o) => o.status === "delivered");

  if (!restaurant) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-sign text-[40px]">{restaurant.name}</h1>
          <p className="mt-1 text-chai-muted">
            {doneToday.length} delivered today. You pay KhaoJi <b className="text-chai">{restaurant.commission_rate}%</b> per order.
          </p>
        </div>
        <button
          onClick={toggleOpen}
          role="switch"
          aria-checked={restaurant.is_open}
          className={`flex min-h-[52px] items-center gap-3 rounded-full border-2 border-chai px-2 pr-5 font-semibold shadow-sticker transition ${
            restaurant.is_open ? "bg-patti text-white" : "bg-white text-chai"
          }`}
        >
          <span className={`relative h-8 w-14 rounded-full ${restaurant.is_open ? "bg-white/30" : "bg-chai-line"}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${restaurant.is_open ? "left-7" : "left-1 bg-chai"}`} />
          </span>
          {restaurant.is_open ? "Taking orders" : "Closed. Tap to open"}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {cols.map((c) => (
          <section key={c.title} className="rounded-[22px] bg-chai-line/40 p-3">
            <h2 className="mb-3 flex items-center gap-2 px-1 font-bold">
              <c.icon size={18} aria-hidden /> {c.title}
              <span className="ml-auto flex h-7 min-w-[28px] items-center justify-center rounded-full bg-white px-2 text-sm tabular-nums">{c.list.length}</span>
            </h2>
            <div className="space-y-3">
              {c.list.length === 0 && <p className="px-1 py-6 text-center text-sm text-chai-muted">{c.empty}</p>}
              {c.list.map((o) => (
                <OrderCard key={o.id} o={o} busy={busy} run={run} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  o,
  busy,
  run,
}: {
  o: OrderFull;
  busy: string | null;
  run: (id: string, a: string, p?: Record<string, unknown>, ok?: string) => Promise<boolean>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const isBusy = !!busy && busy.startsWith(o.id);

  return (
    <article className={`animate-ticket-in overflow-hidden rounded-[18px] bg-white ${o.status === "placed" ? "border-2 border-chai shadow-sticker" : "border border-chai-line"}`}>
      <header className={`flex items-center justify-between gap-2 px-4 py-2.5 ${o.status === "placed" ? "bg-haldi" : "bg-white"}`}>
        <p className="font-sign text-2xl">#{o.order_no}</p>
        <StatusBadge status={o.status} />
      </header>
      <div className="border-t-2 border-dashed border-chai-line px-4 py-3">
        <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-chai-muted">
          <span>{timeAgo(o.created_at)}, for {o.customer?.full_name ?? "a student"}</span>
          <span className="flex items-center gap-1 font-semibold text-chai"><MapPin size={14} aria-hidden />{o.drop_point?.name}</span>
        </p>
        <OrderItemsList order={o} showTotals={false} large />
        <p className="mt-3 flex justify-between text-sm">
          <span className="text-chai-muted">{PAYMENT_LABEL[o.payment_method]}, {PAYMENT_STATUS_LABEL[o.payment_status].toLowerCase()}</span>
          <span className="font-bold tabular-nums">{pkr(o.subtotal)}</span>
        </p>
        {o.rider && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-neel-light px-3 py-2 text-sm text-neel">
            <Bike size={16} aria-hidden /> <b>{o.rider.full_name}</b> {o.rider.phone}
          </p>
        )}
      </div>

      <footer className="px-4 pb-4">
        {o.status === "placed" && !rejecting && (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Timer size={15} aria-hidden /> Accept and say how long it takes</p>
            <div className="grid grid-cols-4 gap-2">
              {PREP_TIMES.map((m) => (
                <button key={m} className="btn btn-sm border-2 border-chai bg-haldi px-0 text-chai hover:bg-haldi-dark" disabled={isBusy} onClick={() => run(o.id, "accept", { prep_mins: m }, `Accepted #${o.order_no}`)}>
                  {m} min
                </button>
              ))}
            </div>
            <button className="mt-2 w-full py-2 text-sm font-semibold text-chili hover:underline" onClick={() => setRejecting(true)}>
              Can't make it
            </button>
          </>
        )}
        {o.status === "placed" && rejecting && (
          <>
            <p className="mb-2 text-sm font-semibold">Why can't you take it?</p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((r) => (
                <button key={r} className="btn-danger btn-sm" disabled={isBusy} onClick={() => run(o.id, "reject", { reason: r }, `Rejected #${o.order_no}`)}>
                  {r}
                </button>
              ))}
              <button className="btn-secondary btn-sm" onClick={() => setRejecting(false)}>
                Back
              </button>
            </div>
          </>
        )}
        {o.status === "accepted" && (
          <button className="btn-chili w-full" disabled={isBusy} onClick={() => run(o.id, "preparing")}>
            Start cooking
          </button>
        )}
        {o.status === "preparing" && (
          <button className="btn-primary w-full" disabled={isBusy} onClick={() => run(o.id, "ready", {}, `#${o.order_no} is ready for pickup`)}>
            Packed, ready for pickup
          </button>
        )}
        {o.status === "accepted" && (
          <button className="mt-2 w-full py-2 text-sm font-semibold text-chai-muted hover:text-chai" disabled={isBusy} onClick={() => run(o.id, "ready", {}, `#${o.order_no} is ready for pickup`)}>
            Already packed? Mark ready
          </button>
        )}
        {o.status === "ready" && !o.rider && <p className="rounded-xl bg-haldi-light px-3 py-2 text-sm font-semibold">Waiting for a rider to accept</p>}
        {o.status === "picked_up" && <p className="text-sm font-semibold text-patti">Rider has it. Nothing left to do.</p>}
      </footer>
    </article>
  );
}
