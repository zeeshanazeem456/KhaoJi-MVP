"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    supabaseBrowser().from("app_settings").select("*").eq("id", 1).single().then(({ data }) => setSettings(data as AppSettings));
  }, []);
  return { settings, setSettings };
}
