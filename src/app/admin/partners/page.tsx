"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AccountStatus, Profile, Restaurant } from "@/lib/types";
import { errMsg } from "@/lib/format";
import { useToast } from "@/components/Toast";

type Partner = Profile & { restaurant?: Restaurant };

const STATUS_CHIP: Record<AccountStatus, string> = {
  pending: "bg-haldi text-chai",
  approved: "bg-patti-light text-patti",
  blocked: "bg-chili-light text-chili-dark",
};

export default function PartnersPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");
  const [list, setList] = useState<Partner[]>([]);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data: profiles } = await sb.from("profiles").select("*").eq("role", tab).order("created_at", { ascending: false });
    let rows = (profiles as Partner[]) ?? [];
    if (tab === "restaurant") {
      const { data: rests } = await sb.from("restaurants").select("*");
      rows = rows.map((p) => ({ ...p, restaurant: (rests as Restaurant[])?.find((r) => r.owner_id === p.id) }));
    }
    // Pending first
    rows.sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0));
    setList(rows);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(p: Partner, status: AccountStatus) {
    const { error } = await supabaseBrowser().rpc("admin_set_status", { p_user_id: p.id, p_status: status });
    if (error) return toast(errMsg(error), "error");
    toast(`${p.restaurant?.name ?? p.full_name} is now ${status}`);
    load();
  }

  async function setCommission(r: Restaurant, value: string) {
    const rate = parseFloat(value);
    if (isNaN(rate) || rate < 0 || rate > 100) return toast("Commission must be 0–100", "error");
    const { error } = await supabaseBrowser().from("restaurants").update({ commission_rate: rate }).eq("id", r.id);
    if (error) return toast(errMsg(error), "error");
    toast(`${r.name} commission set to ${rate}%`);
    load();
  }

  const pending = list.filter((p) => p.status === "pending").length;

  return (
    <div>
      <h1 className="mb-4 h-sign text-[36px]">Partners</h1>
      <div className="mb-4 flex gap-2">
        {(["restaurant", "rider"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? "bg-chai text-white" : "border-2 border-chai-line bg-white"}`}>
            {t === "restaurant" ? "Restaurants" : "Riders"}
          </button>
        ))}
        {pending > 0 && <span className="chip self-center bg-haldi text-chai">{pending} waiting for approval</span>}
      </div>

      <div className="card divide-y divide-chai-line">
        {list.length === 0 && <p className="p-6 text-center text-sm text-chai-muted">No {tab}s yet.</p>}
        {list.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 p-4 text-sm">
            <div className="min-w-[180px] flex-1">
              <p className="font-bold">{p.restaurant?.name ?? p.full_name}</p>
              <p className="text-xs text-chai-muted">
                {p.restaurant ? `${p.full_name} · ` : ""}
                {p.phone}
                {p.restaurant?.cuisine && ` · ${p.restaurant.cuisine}`}
                {tab === "rider" && p.status === "approved" && ` · ${p.is_online ? "online" : "offline"}`}
              </p>
            </div>
            <span className={`chip ${STATUS_CHIP[p.status]}`}>{p.status}</span>

            {p.restaurant && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-chai-muted">Commission %</label>
                <input
                  key={`${p.restaurant.id}-${p.restaurant.commission_rate}`}
                  className="input w-20 py-1.5"
                  type="number"
                  step="0.5"
                  defaultValue={p.restaurant.commission_rate}
                  onBlur={(e) => Number(e.target.value) !== Number(p.restaurant!.commission_rate) && setCommission(p.restaurant!, e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2">
              {p.status !== "approved" && (
                <button className="btn-primary btn-sm" onClick={() => setStatus(p, "approved")}>
                  Approve
                </button>
              )}
              {p.status !== "blocked" && (
                <button className="btn-danger btn-sm" onClick={() => setStatus(p, "blocked")}>
                  Block
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
