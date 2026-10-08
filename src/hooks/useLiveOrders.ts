"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OrderFull } from "@/lib/types";

/**
 * Loads orders and keeps them live.
 * - `load` runs the query (RLS decides what this user can see).
 * - `filter` narrows the realtime subscription, e.g. "restaurant_id=eq.<id>".
 * Any change on a matching order triggers a reload. A slow poll is a safety net
 * for changes realtime can't deliver (e.g. a rider losing sight of an order another rider took).
 */
export function useLiveOrders(
  key: string,
  load: () => Promise<OrderFull[]>,
  opts: { filter?: string; pollMs?: number; onNew?: (o: OrderFull) => void; enabled?: boolean } = {}
) {
  const { filter, pollMs = 20000, onNew, enabled = true } = opts;
  const [orders, setOrders] = useState<OrderFull[]>([]);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  const onNewRef = useRef(onNew);
  const seen = useRef<Set<string> | null>(null);
  loadRef.current = load;
  onNewRef.current = onNew;

  const refresh = useCallback(async () => {
    try {
      const data = await loadRef.current();
      if (seen.current && onNewRef.current) {
        data.filter((o) => !seen.current!.has(o.id)).forEach((o) => onNewRef.current!(o));
      }
      seen.current = new Set(data.map((o) => o.id));
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`orders-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", ...(filter ? { filter } : {}) }, () =>
        refresh()
      )
      .subscribe();
    const t = setInterval(refresh, pollMs);
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [key, filter, pollMs, refresh, enabled]);

  return { orders, loading, refresh };
}

/** Short beep for new-order alerts (no audio file needed). */
export function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* audio not allowed until the user interacts — ignore */
  }
}
