"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { errMsg, PAYMENT_LABEL, pkr } from "@/lib/format";
import { useToast } from "@/components/Toast";

/**
 * SANDBOX payment screen.
 * Real JazzCash/Easypaisa: redirect to the gateway from a server route / Edge Function,
 * and confirm the order in the gateway's signed callback. See README → "Going live with payments".
 */
export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabaseBrowser().from("orders").select("*").eq("id", id).single().then(({ data }) => setOrder(data as Order));
  }, [id]);

  // Already paid (or not a wallet order): go to tracking
  useEffect(() => {
    if (order && order.status !== "pending_payment") router.replace(`/customer/orders/${id}`);
  }, [order, id, router]);

  async function confirm(success: boolean) {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("sandbox_confirm_payment", { p_order_id: id, p_success: success });
    setBusy(false);
    if (error) return toast(errMsg(error), "error");
    toast(success ? "Paid. Your order is on its way to the kitchen." : "Payment failed, so the order was cancelled. Try again or pay cash.", success ? "ok" : "error");
    router.replace(success ? `/customer/orders/${id}` : "/customer/checkout");
  }

  if (!order) return <div className="h-48 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;
  if (order.status !== "pending_payment") return null;

  const wallet = PAYMENT_LABEL[order.payment_method];
  const color = order.payment_method === "jazzcash" ? "bg-chili" : "bg-patti";

  return (
    <div className="mx-auto max-w-sm">
      <div className={`rounded-panel ${color} p-6 text-white`}>
        <p className="font-semibold">{wallet}</p>
        <p className="mt-8 text-white/85">Paying KhaoJi for order #{order.order_no}</p>
        <p className="font-sign text-5xl">{pkr(order.total)}</p>
      </div>
      <p className="mt-4 rounded-xl bg-neel-light px-4 py-3 text-sm text-neel">
        Test mode: this screen stands in for the wallet app. No real money moves.
      </p>
      <div className="mt-5 space-y-3">
        <button className="btn-primary min-h-[56px] w-full text-base" disabled={busy} onClick={() => confirm(true)}>
          Pay {pkr(order.total)}
        </button>
        <button className="btn-danger w-full" disabled={busy} onClick={() => confirm(false)}>
          Simulate a failed payment
        </button>
      </div>
    </div>
  );
}
