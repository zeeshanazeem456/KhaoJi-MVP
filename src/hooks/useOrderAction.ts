"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { errMsg } from "@/lib/format";

/** Calls the `order_action` database function and shows a toast. */
export function useOrderAction(after?: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(orderId: string, action: string, payload: Record<string, unknown> = {}, okText?: string) {
    setBusy(orderId + action);
    const { error } = await supabaseBrowser().rpc("order_action", {
      p_order_id: orderId,
      p_action: action,
      p_payload: payload,
    });
    setBusy(null);
    if (error) {
      toast(errMsg(error), "error");
      return false;
    }
    if (okText) toast(okText);
    after?.();
    return true;
  }

  return { run, busy };
}
