"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, MapPin, Minus, Plus, ShoppingBag, Smartphone } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AppSettings, DropPoint, PaymentMethod } from "@/lib/types";
import { errMsg, PAYMENT_LABEL, pkr } from "@/lib/format";
import { useCart } from "@/components/Cart";
import { useToast } from "@/components/Toast";
import { Empty } from "@/components/Empty";

const METHODS: { id: PaymentMethod; hint: string; icon: typeof Banknote; tag: string }[] = [
  { id: "cod", hint: "Pay the rider at the drop point", icon: Banknote, tag: "bg-patti-light text-patti" },
  { id: "jazzcash", hint: "Pay now from your JazzCash wallet", icon: Smartphone, tag: "bg-chili-light text-chili-dark" },
  { id: "easypaisa", hint: "Pay now from your Easypaisa wallet", icon: Smartphone, tag: "bg-patti-light text-patti" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { cart, setQty, clear, subtotal } = useCart();
  const [points, setPoints] = useState<DropPoint[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dropPoint, setDropPoint] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from("drop_points").select("*").eq("is_active", true).order("name").then(({ data }) => setPoints((data as DropPoint[]) ?? []));
    sb.from("app_settings").select("*").eq("id", 1).single().then(({ data }) => setSettings(data as AppSettings));
  }, []);

  if (!cart)
    return (
      <Empty
        icon={ShoppingBag}
        title="Your cart is empty"
        hint="Pick a place and add something. Your cart will wait here."
        action={<Link href="/customer" className="btn-primary">Find food</Link>}
      />
    );

  const fee = settings?.delivery_fee ?? 0;

  async function placeOrder() {
    if (!cart) return;
    if (!dropPoint) return toast("Choose where to meet your rider", "error");
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc("place_order", {
      p_restaurant_id: cart.restaurant_id,
      p_drop_point_id: dropPoint,
      p_items: cart.lines.map((l) => ({ menu_item_id: l.menu_item_id, qty: l.qty })),
      p_payment_method: method,
      p_note: note,
    });
    setBusy(false);
    if (error) return toast(errMsg(error), "error");
    clear();
    const orderId = data as string;
    router.replace(method === "cod" ? `/customer/orders/${orderId}` : `/customer/pay/${orderId}`);
  }

  return (
    <div className="space-y-7 pb-4">
      <div className="flex items-center gap-3">
        <Link href={`/customer/r/${cart.restaurant_id}`} aria-label={`Back to ${cart.restaurant_name}`} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-chai-line">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        <div>
          <h1 className="h-sign text-[30px]">Your order</h1>
          <p className="text-sm text-chai-muted">from {cart.restaurant_name}</p>
        </div>
      </div>

      <section>
        <ul className="divide-y divide-chai-line">
          {cart.lines.map((l) => (
            <li key={l.menu_item_id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.name}</p>
                <p className="text-sm text-chai-muted tabular-nums">{pkr(l.price)} each</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border-2 border-chai-line p-0.5">
                <button aria-label={`Remove one ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-chai-line" onClick={() => setQty(l.menu_item_id, l.qty - 1)}>
                  <Minus size={16} aria-hidden />
                </button>
                <span className="w-6 text-center font-bold tabular-nums">{l.qty}</span>
                <button aria-label={`Add one more ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-chai-line" onClick={() => setQty(l.menu_item_id, l.qty + 1)}>
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <span className="w-20 text-right font-semibold tabular-nums">{pkr(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="section-title">Where should the rider meet you?</h2>
        <p className="mb-3 text-sm text-chai-muted">Pick a spot on campus.</p>
        <div role="radiogroup" aria-label="Drop point" className="grid grid-cols-2 gap-2">
          {points.map((p) => {
            const on = dropPoint === p.id;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={on}
                onClick={() => setDropPoint(p.id)}
                className={`flex min-h-[56px] items-center gap-2 rounded-2xl border-2 px-3 text-left text-sm font-semibold transition ${
                  on ? "border-chai bg-haldi shadow-sticker-sm" : "border-chai-line hover:border-chai/30"
                }`}
              >
                <MapPin size={18} className={on ? "text-chai" : "text-chili"} aria-hidden />
                {p.name}
              </button>
            );
          })}
        </div>
        <label htmlFor="note" className="label mt-4">Note for the kitchen or rider</label>
        <textarea id="note" className="input py-3" rows={2} placeholder="Less spicy, extra raita, call when you reach…" value={note} onChange={(e) => setNote(e.target.value)} />
      </section>

      <section>
        <h2 className="section-title mb-3">How do you want to pay?</h2>
        <div role="radiogroup" aria-label="Payment method" className="space-y-2">
          {METHODS.map((m) => {
            const on = method === m.id;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(m.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? "border-chai" : "border-chai-line hover:border-chai/30"}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${m.tag}`}>
                  <m.icon size={19} aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{PAYMENT_LABEL[m.id]}</span>
                  <span className="block text-sm text-chai-muted">{m.hint}</span>
                </span>
                {m.id !== "cod" && settings?.payments_mode === "sandbox" && <span className="chip bg-neel-light text-neel">Test mode</span>}
                <span aria-hidden className={`h-5 w-5 rounded-full border-2 ${on ? "border-chai bg-chai ring-4 ring-inset ring-white" : "border-chai/30"}`} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[18px] bg-haldi-light p-4">
        <dl className="space-y-1">
          <div className="flex justify-between text-chai-muted"><dt>Food</dt><dd className="tabular-nums">{pkr(subtotal)}</dd></div>
          <div className="flex justify-between text-chai-muted"><dt>Delivery to campus</dt><dd className="tabular-nums">{pkr(fee)}</dd></div>
          <div className="flex justify-between pt-1 text-xl font-bold"><dt>Total</dt><dd className="tabular-nums">{pkr(subtotal + fee)}</dd></div>
        </dl>
      </section>

      <button className="btn-primary min-h-[56px] w-full text-base" disabled={busy} onClick={placeOrder}>
        {busy ? "Placing your order…" : method === "cod" ? `Place order, pay ${pkr(subtotal + fee)} on delivery` : `Pay ${pkr(subtotal + fee)} with ${PAYMENT_LABEL[method]}`}
      </button>
    </div>
  );
}
