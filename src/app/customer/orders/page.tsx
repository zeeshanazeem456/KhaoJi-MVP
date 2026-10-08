"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt, RotateCcw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull } from "@/lib/types";
import { ORDER_SELECT, pkr, timeAgo } from "@/lib/format";
import { useLiveOrders } from "@/hooks/useLiveOrders";
import { StatusBadge } from "@/components/StatusBadge";
import { Empty } from "@/components/Empty";
import { RestaurantSign } from "@/components/RestaurantSign";
import { useCart } from "@/components/Cart";

const ACTIVE = ["placed", "accepted", "preparing", "ready", "picked_up", "pending_payment"];

export default function MyOrdersPage() {
  const router = useRouter();
  const { replace } = useCart();
  const { orders, loading } = useLiveOrders("customer-list", async () => {
    const { data } = await supabaseBrowser()
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as OrderFull[]) ?? [];
  });

  function reorder(o: OrderFull) {
    replace({
      restaurant_id: o.restaurant_id,
      restaurant_name: o.restaurant?.name ?? "",
      lines: (o.order_items ?? [])
        .filter((i) => i.menu_item_id)
        .map((i) => ({ menu_item_id: i.menu_item_id!, name: i.name, price: i.price, qty: i.qty })),
    });
    router.push("/customer/checkout");
  }

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));

  return (
    <div>
      <h1 className="h-sign mb-5 text-[36px]">My orders</h1>
      {loading ? (
        <div className="h-24 animate-pulse rounded-[18px] bg-chai-line" aria-label="Loading orders" />
      ) : orders.length === 0 ? (
        <Empty icon={Receipt} title="No orders yet" hint="Your first order will show up here, with live tracking." action={<Link href="/customer" className="btn-primary">Find food</Link>} />
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-8 space-y-3">
              <h2 className="section-title">Happening now</h2>
              {active.map((o) => (
                <Link key={o.id} href={`/customer/orders/${o.id}`} className="flex items-center gap-4 rounded-[18px] border-2 border-chai bg-haldi-light p-4 shadow-sticker-sm">
                  <RestaurantSign cuisine={o.restaurant?.cuisine ?? ""} name={o.restaurant?.name ?? ""} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{o.restaurant?.name}</p>
                    <p className="text-sm text-chai-muted">Order #{o.order_no}, {pkr(o.total)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="section-title mb-1">Past orders</h2>
              <ul className="divide-y divide-chai-line">
                {past.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-4">
                    <Link href={`/customer/orders/${o.id}`} className="min-w-0 flex-1">
                      <p className="font-semibold">{o.restaurant?.name}</p>
                      <p className="line-clamp-1 text-sm text-chai-muted">{o.order_items?.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm">
                        <StatusBadge status={o.status} />
                        <span className="text-chai-muted">{timeAgo(o.created_at)}</span>
                      </p>
                    </Link>
                    <button className="btn-secondary btn-sm" onClick={() => reorder(o)}>
                      <RotateCcw size={15} aria-hidden /> Reorder
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
