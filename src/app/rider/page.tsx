"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull, Profile } from "@/lib/types";
import { errMsg, ORDER_SELECT, pkr, timeAgo } from "@/lib/format";
import { ArrowDown, Banknote, Bike, MapPin, Phone, Power, Store } from "lucide-react";
import { beep, useLiveOrders } from "@/hooks/useLiveOrders";
import { useOrderAction } from "@/hooks/useOrderAction";
import { useSettings } from "@/hooks/useSettings";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderItemsList } from "@/components/OrderItemsList";
import { Empty } from "@/components/Empty";
import { useToast } from "@/components/Toast";

export default function RiderHomePage() {
  const toast = useToast();
  const { settings } = useSettings();
  const [me, setMe] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
      setMe(data as Profile);
    })();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from("orders")
      .select(ORDER_SELECT)
      .in("status", ["preparing", "ready", "picked_up"])
      .order("created_at", { ascending: true });
    return (data as OrderFull[]) ?? [];
  }, []);

  const { orders, refresh } = useLiveOrders("rider", load, {
    pollMs: 10000,
    enabled: !!me,
    onNew: (o) => {
      if (!o.rider_id && me?.is_online) {
        beep();
        toast(`New delivery from ${o.restaurant?.name}`, "info");
      }
    },
  });
  const { run, busy } = useOrderAction(refresh);

  async function toggleOnline() {
    if (!me) return;
    const { error } = await supabaseBrowser().from("profiles").update({ is_online: !me.is_online }).eq("id", me.id);
    if (error) return toast(errMsg(error), "error");
    setMe({ ...me, is_online: !me.is_online });
    refresh();
  }

  if (!me) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  const mine = orders.filter((o) => o.rider_id === me.id);
  const available = orders.filter((o) => !o.rider_id);

  return (
    <div className="space-y-8">
      <button
        onClick={toggleOnline}
        role="switch"
        aria-checked={me.is_online}
        className={`flex w-full items-center gap-4 rounded-panel border-2 border-chai p-5 text-left shadow-sticker transition ${
          me.is_online ? "bg-patti text-white" : "bg-white"
        }`}
      >
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${me.is_online ? "bg-white text-patti" : "bg-chai text-white"}`}>
          <Power size={26} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="h-sign block text-[28px]">{me.is_online ? "You're online" : "You're offline"}</span>
          <span className={`block text-sm ${me.is_online ? "text-white/90" : "text-chai-muted"}`}>
            {me.is_online ? "Tap to stop taking deliveries." : "Tap to start taking deliveries."}
          </span>
        </span>
      </button>

      {settings && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-haldi-light p-3">
            <p className="font-sign text-xl">{pkr(settings.rider_base_pay)}</p>
            <p className="text-xs text-chai-muted">every delivery</p>
          </div>
          <div className="rounded-2xl bg-haldi-light p-3">
            <p className="font-sign text-xl">+{pkr(settings.peak_bonus)}</p>
            <p className="text-xs text-chai-muted">rush hour, {settings.peak_start.slice(0, 5)} to {settings.peak_end.slice(0, 5)}</p>
          </div>
          <div className="rounded-2xl bg-haldi-light p-3">
            <p className="font-sign text-xl">+{pkr(settings.daily_target_bonus)}</p>
            <p className="text-xs text-chai-muted">at {settings.daily_target} trips a day</p>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Your delivery</h2>
          {mine.map((o) => {
            const isBusy = !!busy && busy.startsWith(o.id);
            const cod = o.payment_method === "cod";
            return (
              <article key={o.id} className="overflow-hidden rounded-panel border-2 border-chai">
                <div className="flex items-center justify-between bg-neel px-5 py-3 text-white">
                  <p className="font-sign text-xl">#{o.order_no}</p>
                  <StatusBadge status={o.status} />
                </div>
                <div className="space-y-1 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-haldi"><Store size={17} aria-hidden /></span>
                    <div>
                      <p className="text-sm text-chai-muted">Pick up from</p>
                      <p className="text-lg font-bold">{o.restaurant?.name}</p>
                    </div>
                  </div>
                  <ArrowDown size={18} className="ml-2 text-chai-muted" aria-hidden />
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chili text-white"><MapPin size={17} aria-hidden /></span>
                    <div className="flex-1">
                      <p className="text-sm text-chai-muted">Hand over at</p>
                      <p className="text-lg font-bold">{o.drop_point?.name}</p>
                      <p className="text-sm">
                        {o.customer?.full_name}
                        {o.customer?.phone && (
                          <a className="ml-2 inline-flex items-center gap-1 font-semibold text-chili" href={`tel:${o.customer.phone}`}>
                            <Phone size={13} aria-hidden /> {o.customer.phone}
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className={`!mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold ${cod ? "bg-haldi-light" : "bg-patti-light text-patti"}`}>
                    <Banknote size={18} aria-hidden />
                    {cod ? `Collect ${pkr(o.total)} in cash` : "Already paid online. Collect nothing."}
                  </p>
                  <div className="!mt-4"><OrderItemsList order={o} showTotals={false} /></div>
                  <div className="!mt-5">
                    {o.status === "preparing" && <p className="rounded-xl bg-neel-light px-3 py-2.5 text-sm font-semibold text-neel">Still cooking. Head to the restaurant now.</p>}
                    {o.status === "ready" && (
                      <button className="btn-primary min-h-[56px] w-full text-base" disabled={isBusy} onClick={() => run(o.id, "picked_up", {}, "Picked up")}>
                        I've picked it up
                      </button>
                    )}
                    {o.status === "picked_up" && (
                      <button className="btn min-h-[56px] w-full border-2 border-chai bg-patti text-base text-white shadow-sticker" disabled={isBusy} onClick={() => run(o.id, "delivered", {}, "Delivered! Earnings added.")}>
                        Delivered{cod ? `, ${pkr(o.total)} collected` : ""}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section>
        <h2 className="section-title mb-3 flex items-center gap-2">
          Deliveries you can take
          {me.is_online && <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-chai px-2 text-sm text-white tabular-nums">{available.length}</span>}
        </h2>
        {!me.is_online ? (
          <Empty icon={Power} title="Go online to see deliveries" hint="New pickups from restaurants near FAST show up here." />
        ) : available.length === 0 ? (
          <Empty icon={Bike} title="No pickups right now" hint="Stay online. New ones appear here with a beep." />
        ) : (
          <ul className="space-y-3">
            {available.map((o) => (
              <li key={o.id} className="rounded-[22px] border border-chai-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{o.restaurant?.name}</p>
                    <p className="flex items-center gap-1 text-chai-muted"><MapPin size={14} aria-hidden /> to {o.drop_point?.name}</p>
                  </div>
                  {settings && <p className="font-sign text-2xl text-patti">{pkr(settings.rider_base_pay)}</p>}
                </div>
                <p className="mt-2 text-sm text-chai-muted">
                  {o.status === "ready" ? "Packed and waiting" : "Being cooked"}, ordered {timeAgo(o.created_at)}. {o.payment_method === "cod" ? `Collect ${pkr(o.total)} cash.` : "Prepaid."}
                </p>
                <button className="btn-primary mt-3 w-full" disabled={!!busy} onClick={() => run(o.id, "claim", {}, "It's yours. Head to the restaurant.")}>
                  Take this delivery
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
