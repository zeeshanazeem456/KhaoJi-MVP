"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { ArrowLeft, Bike, MapPin, Phone, Wallet } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull, OrderStatus } from "@/lib/types";
import { FLOW, ORDER_SELECT, PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";
import { useLiveOrders } from "@/hooks/useLiveOrders";
import { useOrderAction } from "@/hooks/useOrderAction";
import { OrderItemsList } from "@/components/OrderItemsList";
import { TruckBand } from "@/components/TruckBand";

const HEADLINE: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  placed: "Sent to the kitchen",
  accepted: "Kitchen said yes",
  preparing: "Being cooked",
  ready: "Packed and waiting",
  picked_up: "On the way to you",
  delivered: "Delivered. Enjoy!",
  rejected: "The kitchen couldn't take it",
  cancelled: "Order cancelled",
};

const SUB: Partial<Record<OrderStatus, string>> = {
  placed: "The restaurant will accept it in a minute or two.",
  ready: "A rider is picking it up.",
  picked_up: "Head to your drop point.",
  delivered: "Hope it hit the spot.",
};

const SHORT = ["Placed", "Accepted", "Cooking", "Packed", "On the way", "Delivered"];

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("orders").select(ORDER_SELECT).eq("id", id);
    return (data as OrderFull[]) ?? [];
  }, [id]);
  const { orders, loading, refresh } = useLiveOrders(`track-${id}`, load, { filter: `id=eq.${id}`, pollMs: 15000 });
  const { run, busy } = useOrderAction(refresh);
  const o = orders[0];

  if (loading) return <div className="h-64 animate-pulse rounded-panel bg-chai-line" aria-label="Loading order" />;
  if (!o) return <p className="text-chai-muted">We couldn't find this order.</p>;

  const step = FLOW.indexOf(o.status);
  const closed = o.status === "rejected" || o.status === "cancelled";
  const pct = step < 0 ? 0 : (step / (FLOW.length - 1)) * 100;
  const sub =
    o.status === "rejected"
      ? `Reason: ${o.reject_reason ?? "not given"}.${o.payment_status === "refund_pending" ? " Your payment will be refunded." : ""}`
      : ["accepted", "preparing"].includes(o.status) && o.prep_mins
        ? `Ready in about ${o.prep_mins} minutes.`
        : SUB[o.status];

  return (
    <div className="space-y-6">
      <Link href="/customer/orders" aria-label="Back to my orders" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-chai-line">
        <ArrowLeft size={20} aria-hidden />
      </Link>

      <section className={`overflow-hidden rounded-panel text-white ${closed ? "bg-chili" : o.status === "delivered" ? "bg-patti" : "bg-neel"}`}>
        <div className="p-5 pb-6">
          <p className="text-white/80">
            Order #{o.order_no} from {o.restaurant?.name}
          </p>
          <h1 className="h-sign mt-2 text-[34px]" aria-live="polite">{HEADLINE[o.status]}</h1>
          {sub && <p className="mt-2 text-white/90">{sub}</p>}

          {!closed && step >= 0 && (
            <div className="mt-7" aria-label={`Step ${step + 1} of ${FLOW.length}`}>
              <div className="relative mx-3 h-11">
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20" />
                <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-haldi transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
                {FLOW.map((s, i) => (
                  <span
                    key={s}
                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${i <= step ? "bg-haldi" : "bg-white/35"}`}
                    style={{ left: `${(i / (FLOW.length - 1)) * 100}%` }}
                  />
                ))}
                <span
                  className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-chai bg-haldi text-chai transition-[left] duration-700 ease-out"
                  style={{ left: `${pct}%` }}
                >
                  <Bike size={22} aria-hidden />
                </span>
              </div>
              <ol className="mt-2 grid grid-cols-6 text-center text-[11px] leading-tight">
                {SHORT.map((s, i) => (
                  <li key={s} className={i === step ? "font-bold text-haldi" : i < step ? "text-white/85" : "text-white/50"}>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <TruckBand height={10} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-haldi-light"><Bike size={20} aria-hidden /></span>
          <div className="flex-1">
            <p className="text-sm text-chai-muted">Your rider</p>
            <p className="font-semibold">{o.rider ? o.rider.full_name : "Not assigned yet"}</p>
          </div>
          {o.rider && (
            <a href={`tel:${o.rider.phone}`} className="btn-secondary btn-sm">
              <Phone size={15} aria-hidden /> Call
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-chili-light text-chili"><MapPin size={20} aria-hidden /></span>
          <div>
            <p className="text-sm text-chai-muted">Meet at</p>
            <p className="font-semibold">{o.drop_point?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-patti-light text-patti"><Wallet size={20} aria-hidden /></span>
          <div>
            <p className="text-sm text-chai-muted">Payment</p>
            <p className="font-semibold">
              {PAYMENT_LABEL[o.payment_method]}, {PAYMENT_STATUS_LABEL[o.payment_status].toLowerCase()}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-chai-line p-4">
        <h2 className="section-title mb-3">What you ordered</h2>
        <OrderItemsList order={o} />
      </section>

      {o.status === "placed" && (
        <button className="btn-danger w-full" disabled={!!busy} onClick={() => run(o.id, "cancel", {}, "Order cancelled")}>
          Cancel order
        </button>
      )}
    </div>
  );
}
