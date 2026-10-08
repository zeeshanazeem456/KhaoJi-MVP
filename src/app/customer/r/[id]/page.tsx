"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Minus, Plus, ShoppingBag } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { MenuItem, Restaurant } from "@/lib/types";
import { pkr } from "@/lib/format";
import { cuisineLook } from "@/lib/cuisine";
import { useCart } from "@/components/Cart";
import { useToast } from "@/components/Toast";
import { TruckBand } from "@/components/TruckBand";

export default function MenuPage() {
  const { id } = useParams<{ id: string }>();
  const [rest, setRest] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const { cart, add, setQty, count, subtotal } = useCart();
  const toast = useToast();

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from("restaurants").select("*").eq("id", id).single().then(({ data }) => setRest(data as Restaurant));
    sb.from("menu_items")
      .select("*")
      .eq("restaurant_id", id)
      .order("category")
      .order("name")
      .then(({ data }) => setItems((data as MenuItem[]) ?? []));
  }, [id]);

  const byCategory = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    items.forEach((i) => m.set(i.category, [...(m.get(i.category) ?? []), i]));
    return [...m.entries()];
  }, [items]);

  const qtyOf = (itemId: string) =>
    cart?.restaurant_id === id ? cart.lines.find((l) => l.menu_item_id === itemId)?.qty ?? 0 : 0;

  if (!rest) return <div className="h-48 animate-pulse rounded-panel bg-chai-line" aria-label="Loading menu" />;
  const look = cuisineLook(rest.cuisine, rest.name);

  return (
    <div className="pb-28">
      {/* Shop signboard */}
      <div className={`-mx-4 -mt-5 ${look.bg} ${look.text}`}>
        <div className="px-4 pb-6 pt-4">
          <Link
            href="/customer"
            aria-label="Back to all restaurants"
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-chai"
          >
            <ArrowLeft size={20} aria-hidden />
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="h-sign text-[38px]">{rest.name}</h1>
              <p className="mt-2 max-w-sm opacity-90">{rest.description}</p>
            </div>
            <look.icon size={56} strokeWidth={1.6} aria-hidden className="mb-1 shrink-0 opacity-90" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip bg-white py-1 text-sm text-chai">
              <Clock size={14} aria-hidden /> {rest.est_delivery_mins} min to your gate
            </span>
            <span className={`chip py-1 text-sm ${rest.is_open ? "bg-patti text-white" : "bg-chai text-white"}`}>
              {rest.is_open ? "Open now" : "Closed right now"}
            </span>
          </div>
        </div>
        <TruckBand height={12} />
      </div>

      {/* Category jump bar */}
      {byCategory.length > 1 && (
        <nav aria-label="Menu sections" className="sticky top-[62px] z-20 -mx-4 mb-2 flex gap-2 overflow-x-auto bg-white/95 px-4 py-3 backdrop-blur [scrollbar-width:none]">
          {byCategory.map(([cat]) => (
            <a key={cat} href={`#cat-${cat}`} className="chip shrink-0 border-2 border-chai-line px-3 py-1.5 text-sm hover:border-chai/30">
              {cat}
            </a>
          ))}
        </nav>
      )}

      {byCategory.map(([cat, list]) => (
        <section key={cat} id={`cat-${cat}`} className="scroll-mt-32 pt-4">
          <h2 className="section-title mb-1">{cat}</h2>
          <ul className="divide-y divide-chai-line">
            {list.map((item) => {
              const qty = qtyOf(item.id);
              const canAdd = rest.is_open && item.is_available;
              return (
                <li key={item.id} className={`flex items-center gap-3 py-4 ${item.is_available ? "" : "opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    {item.description && <p className="text-sm text-chai-muted">{item.description}</p>}
                    <p className="mt-1 font-bold tabular-nums">{pkr(item.price)}</p>
                  </div>
                  {!item.is_available ? (
                    <span className="chip bg-chai-line text-chai-muted">Sold out</span>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-1 rounded-full border-2 border-chai bg-haldi p-0.5">
                      <button aria-label={`Remove one ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/60" onClick={() => setQty(item.id, qty - 1)}>
                        <Minus size={16} aria-hidden />
                      </button>
                      <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">{qty}</span>
                      <button aria-label={`Add one more ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/60" onClick={() => setQty(item.id, qty + 1)}>
                        <Plus size={16} aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label={`Add ${item.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-chai bg-white transition hover:bg-haldi disabled:opacity-40"
                      disabled={!canAdd}
                      onClick={() => {
                        if (cart && cart.restaurant_id !== id) toast(`Started a new cart for ${rest.name}`, "info");
                        add({ id: rest.id, name: rest.name }, { menu_item_id: item.id, name: item.name, price: item.price });
                      }}
                    >
                      <Plus size={20} aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {count > 0 && cart?.restaurant_id === id && (
        <div className="fixed inset-x-0 bottom-[76px] z-20 px-4 sm:bottom-5">
          <Link
            href="/customer/checkout"
            className="mx-auto flex min-h-[60px] w-full max-w-xl items-center gap-3 rounded-full border-2 border-chai bg-chai px-3 text-white shadow-[3px_3px_0_0_#FFC72C]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-haldi font-bold text-chai tabular-nums">{count}</span>
            <span className="flex-1">
              <span className="block text-sm text-white/75">{rest.name}</span>
              <span className="block font-bold tabular-nums">{pkr(subtotal)}</span>
            </span>
            <span className="flex items-center gap-1.5 pr-3 font-semibold">
              <ShoppingBag size={18} aria-hidden /> View cart
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
