"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";

/** The restaurant owned by the logged-in user. */
export function useMyRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const reload = useCallback(async () => {
    const sb = supabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from("restaurants").select("*").eq("owner_id", user.id).single();
    setRestaurant(data as Restaurant);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { restaurant, reload, setRestaurant };
}
