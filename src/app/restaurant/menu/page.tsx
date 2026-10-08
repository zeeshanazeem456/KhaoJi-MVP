"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { MenuItem } from "@/lib/types";
import { errMsg, pkr } from "@/lib/format";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { useToast } from "@/components/Toast";
import { Empty } from "@/components/Empty";

type Draft = { id?: string; name: string; description: string; category: string; price: string };
const EMPTY: Draft = { name: "", description: "", category: "", price: "" };

export default function MenuManagementPage() {
  const toast = useToast();
  const { restaurant, setRestaurant } = useMyRestaurant();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [info, setInfo] = useState({ description: "", est_delivery_mins: 30 });

  const load = useCallback(async () => {
    if (!restaurant) return;
    const { data } = await supabaseBrowser()
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("category")
      .order("name");
    setItems((data as MenuItem[]) ?? []);
  }, [restaurant]);

  useEffect(() => {
    load();
    if (restaurant) setInfo({ description: restaurant.description, est_delivery_mins: restaurant.est_delivery_mins });
  }, [load, restaurant]);

  const grouped = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    items.forEach((i) => m.set(i.category, [...(m.get(i.category) ?? []), i]));
    return [...m.entries()];
  }, [items]);
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  async function save() {
    if (!restaurant || !draft) return;
    const price = parseInt(draft.price, 10);
    if (!draft.name.trim() || isNaN(price) || price < 0) return toast("Enter a name and a valid price", "error");
    const row = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category.trim() || "Main",
      price,
    };
    const sb = supabaseBrowser();
    const { error } = draft.id
      ? await sb.from("menu_items").update(row).eq("id", draft.id)
      : await sb.from("menu_items").insert({ ...row, restaurant_id: restaurant.id });
    if (error) return toast(errMsg(error), "error");
    toast(draft.id ? "Item updated" : "Item added");
    setDraft(null);
    load();
  }

  async function toggle(item: MenuItem) {
    const { error } = await supabaseBrowser().from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) return toast(errMsg(error), "error");
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)));
  }

  async function remove(item: MenuItem) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    const { error } = await supabaseBrowser().from("menu_items").delete().eq("id", item.id);
    if (error) return toast(errMsg(error), "error");
    setItems(items.filter((i) => i.id !== item.id));
  }

  async function saveInfo() {
    if (!restaurant) return;
    const { error } = await supabaseBrowser().from("restaurants").update(info).eq("id", restaurant.id);
    if (error) return toast(errMsg(error), "error");
    setRestaurant({ ...restaurant, ...info });
    toast("Restaurant info saved");
  }

  if (!restaurant) return <div className="h-40 animate-pulse rounded-panel bg-chai-line" aria-label="Loading" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="h-sign text-[36px]">Menu</h1>
          <button className="btn-primary" onClick={() => setDraft({ ...EMPTY })}>
            + Add item
          </button>
        </div>

        {draft && (
          <div className="card mb-5 space-y-3 p-4 border-2 border-chai shadow-sticker">
            <h2 className="font-bold">{draft.id ? "Edit item" : "New item"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Price (Rs)</label>
                <input className="input" inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="input"
                  list="cats"
                  placeholder="e.g. Biryani, Drinks"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
                <datalist id="cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>
                Save
              </button>
              <button className="btn-secondary" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <Empty title="No menu items yet" hint="Add your first dish to start getting orders." />
        ) : (
          grouped.map(([cat, list]) => (
            <section key={cat} className="mb-5">
              <h2 className="mb-2 section-title">{cat}</h2>
              <div className="card divide-y divide-chai-line">
                {list.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${item.is_available ? "" : "text-chai-muted line-through"}`}>{item.name}</p>
                      <p className="text-xs text-chai-muted">
                        {pkr(item.price)}
                        {item.description && ` · ${item.description}`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(item)}
                      className={`chip ${item.is_available ? "bg-patti-light text-patti" : "bg-chai-line text-chai-muted"}`}
                    >
                      {item.is_available ? "Available" : "Sold out"}
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        setDraft({ id: item.id, name: item.name, description: item.description, category: item.category, price: String(item.price) })
                      }
                    >
                      Edit
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => remove(item)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <aside className="card h-fit space-y-3 p-4">
        <h2 className="font-bold">Restaurant info</h2>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Usual delivery time (minutes)</label>
          <input
            className="input"
            type="number"
            min={5}
            value={info.est_delivery_mins}
            onChange={(e) => setInfo({ ...info, est_delivery_mins: parseInt(e.target.value || "0", 10) })}
          />
        </div>
        <button className="btn-secondary w-full" onClick={saveInfo}>
          Save info
        </button>
      </aside>
    </div>
  );
}
