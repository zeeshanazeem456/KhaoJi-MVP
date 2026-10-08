"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AppSettings, DropPoint } from "@/lib/types";
import { errMsg } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/Toast";

const NUM_FIELDS: { key: keyof AppSettings; label: string }[] = [
  { key: "delivery_fee", label: "Delivery fee charged to customer (Rs)" },
  { key: "rider_base_pay", label: "Rider base pay per delivery (Rs)" },
  { key: "peak_bonus", label: "Peak-hour bonus per delivery (Rs)" },
  { key: "daily_target", label: "Daily delivery target (count)" },
  { key: "daily_target_bonus", label: "Bonus for hitting the daily target (Rs)" },
];

export default function SettingsPage() {
  const toast = useToast();
  const { settings, setSettings } = useSettings();
  const [points, setPoints] = useState<DropPoint[]>([]);
  const [newPoint, setNewPoint] = useState("");

  const loadPoints = useCallback(async () => {
    const { data } = await supabaseBrowser().from("drop_points").select("*").order("name");
    setPoints((data as DropPoint[]) ?? []);
  }, []);
  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  async function saveSettings() {
    if (!settings) return;
    const { id, ...rest } = settings;
    const { error } = await supabaseBrowser().from("app_settings").update(rest).eq("id", id);
    if (error) return toast(errMsg(error), "error");
    toast("Settings saved");
  }

  async function addPoint() {
    if (!newPoint.trim()) return;
    const { error } = await supabaseBrowser().from("drop_points").insert({ name: newPoint.trim() });
    if (error) return toast(errMsg(error), "error");
    setNewPoint("");
    loadPoints();
  }

  async function updatePoint(p: DropPoint, patch: Partial<DropPoint>) {
    const { error } = await supabaseBrowser().from("drop_points").update(patch).eq("id", p.id);
    if (error) return toast(errMsg(error), "error");
    loadPoints();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <h2 className="section-title">Fees and rider pay</h2>
        {!settings ? (
          <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />
        ) : (
          <>
            {NUM_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={settings[f.key] as number}
                  onChange={(e) => setSettings({ ...settings, [f.key]: parseInt(e.target.value || "0", 10) })}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Peak hours start</label>
                <input className="input" type="time" value={settings.peak_start.slice(0, 5)} onChange={(e) => setSettings({ ...settings, peak_start: e.target.value })} />
              </div>
              <div>
                <label className="label">Peak hours end</label>
                <input className="input" type="time" value={settings.peak_end.slice(0, 5)} onChange={(e) => setSettings({ ...settings, peak_end: e.target.value })} />
              </div>
            </div>
            <p className="rounded-xl bg-neel-light p-3 text-sm text-neel">
              Wallet payments are in <b>{settings.payments_mode}</b> mode. Switch to live only after the real JazzCash/Easypaisa
              integration is deployed (see README).
            </p>
            <button className="btn-primary w-full" onClick={saveSettings}>
              Save settings
            </button>
          </>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Drop points</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="e.g. Sports Complex" value={newPoint} onChange={(e) => setNewPoint(e.target.value)} />
          <button className="btn-primary" onClick={addPoint}>
            Add
          </button>
        </div>
        <div className="divide-y divide-chai-line">
          {points.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-2.5">
              <input
                key={p.name}
                className="input py-1.5"
                defaultValue={p.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && updatePoint(p, { name: e.target.value.trim() })}
              />
              <button
                className={`chip shrink-0 ${p.is_active ? "bg-patti-light text-patti" : "bg-chai-line text-chai-muted"}`}
                onClick={() => updatePoint(p, { is_active: !p.is_active })}
              >
                {p.is_active ? "Active" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
