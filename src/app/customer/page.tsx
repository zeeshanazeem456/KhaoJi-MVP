"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";
import { CUISINE_FILTERS, cuisineLook } from "@/lib/cuisine";
import { Empty } from "@/components/Empty";
import { RestaurantSign } from "@/components/RestaurantSign";

/** Copy that fits hostel life at different times of day (Pakistan time on the device). */
function greeting(hour: number) {
  if (hour >= 22 || hour < 4) return { line: "Late-night cravings", urdu: "رات کی بھوک" };
  if (hour < 11) return { line: "Nashta before class", urdu: "ناشتہ کر لو" };
  if (hour < 16) return { line: "Lunch break", urdu: "کھانا کھا لو" };
  if (hour < 19) return { line: "Chai time", urdu: "چائے کا وقت" };
  return { line: "Dinner time", urdu: "کھانا کھا لو" };
}

export default function RestaurantsPage() {
  const [list, setList] = useState<Restaurant[] | null>(null);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [hello, setHello] = useState(greeting(12));

  useEffect(() => {
    setHello(greeting(new Date().getHours()));
    const sb = supabaseBrowser();
    sb.from("restaurants")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setList((data as Restaurant[]) ?? []));
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await sb.from("profiles").select("full_name").eq("id", data.user.id).single();
      setName(p?.full_name?.split(" ")[0] ?? "");
    });
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list ?? []).filter(
      (r) =>
        (!filter || cuisineLook(r.cuisine, r.name).key === filter) &&
        `${r.name} ${r.cuisine} ${r.description}`.toLowerCase().includes(term)
    );
  }, [list, q, filter]);
  const open = shown.filter((r) => r.is_open);
  const closed = shown.filter((r) => !r.is_open);
  const openCount = list?.filter((r) => r.is_open).length ?? 0;

  return (
    <div>
      <section className="mb-5">
        <h1 className="h-sign text-[40px] text-chai">
          {hello.line}
          {name && `, ${name}`}?
        </h1>
        <p lang="ur" dir="rtl" className="mt-1 text-left font-urdu text-xl leading-[2.1] text-chili">
          {hello.urdu}
        </p>
        <p className="text-chai-muted">
          {list === null ? "Checking who's open…" : `${openCount} places open now, delivering to your hostel gate.`}
        </p>
      </section>

      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-chai-muted" aria-hidden />
        <input
          className="input rounded-full pl-11"
          placeholder="Search biryani, chai, zinger…"
          aria-label="Search restaurants and dishes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filter by food">
        {CUISINE_FILTERS.map((c) => {
          const on = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(on ? null : c.key)}
              aria-pressed={on}
              className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-semibold transition ${
                on ? "border-chai bg-chai text-white" : "border-chai-line bg-white hover:border-chai/30"
              }`}
            >
              <c.icon size={16} aria-hidden />
              {c.label}
            </button>
          );
        })}
      </div>

      {list === null ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse gap-4 py-2">
              <div className="h-16 w-16 rounded-2xl bg-chai-line" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-4 w-1/2 rounded bg-chai-line" />
                <div className="h-3 w-3/4 rounded bg-chai-line" />
              </div>
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Empty icon={Search} title="Nothing matches that" hint="Try a different dish, or clear the filter." />
      ) : (
        <>
          <ul className="divide-y divide-chai-line">
            {open.map((r) => (
              <RestaurantRow key={r.id} r={r} />
            ))}
          </ul>
          {closed.length > 0 && (
            <>
              <h2 className="mb-1 mt-8 section-title text-chai-muted">Closed right now</h2>
              <ul className="divide-y divide-chai-line opacity-60">
                {closed.map((r) => (
                  <RestaurantRow key={r.id} r={r} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function RestaurantRow({ r }: { r: Restaurant }) {
  return (
    <li>
      <Link href={`/customer/r/${r.id}`} className="group flex items-center gap-4 rounded-2xl py-3.5">
        <RestaurantSign cuisine={r.cuisine} name={r.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold group-hover:text-chili">{r.name}</p>
          <p className="line-clamp-1 text-sm text-chai-muted">{r.description || r.cuisine}</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium">
            <Clock size={14} aria-hidden />
            {r.is_open ? `${r.est_delivery_mins} min` : "Opens later"}
          </p>
        </div>
      </Link>
    </li>
  );
}
