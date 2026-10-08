"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bike, Store, UtensilsCrossed } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AuthCard } from "../AuthCard";

type SignupRole = "customer" | "restaurant" | "rider";

const ROLES = [
  { id: "customer" as const, label: "Order food", hint: "Students and staff", icon: UtensilsCrossed },
  { id: "restaurant" as const, label: "Sell food", hint: "Dhabas, cafés, home chefs", icon: Store },
  { id: "rider" as const, label: "Deliver", hint: "Earn per trip plus bonuses", icon: Bike },
];

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("customer");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "", restaurant_name: "", cuisine: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabaseBrowser().auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role,
          full_name: form.full_name,
          phone: form.phone,
          restaurant_name: form.restaurant_name,
          cuisine: form.cuisine,
        },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) {
      // Email confirmation is switched on in Supabase
      return setInfo("Check your email to confirm your account, then log in.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Create an account" subtitle="What brings you to KhaoJi?">
      <div role="radiogroup" aria-label="Account type" className="mb-6 grid grid-cols-3 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={role === r.id}
            onClick={() => setRole(r.id)}
            className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition ${
              role === r.id ? "border-chai bg-haldi shadow-sticker-sm" : "border-chai-line hover:border-chai/30"
            }`}
          >
            <r.icon size={20} aria-hidden />
            <span className="text-sm font-bold leading-tight">{r.label}</span>
            <span className="text-[11px] leading-tight text-chai/70">{r.hint}</span>
          </button>
        ))}
      </div>

      {info ? (
        <p role="status" className="rounded-2xl bg-patti-light p-4 text-patti">{info}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="label">Full name</label>
            <input id="full_name" className="input" required value={form.full_name} onChange={set("full_name")} />
          </div>
          {role === "restaurant" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="restaurant_name" className="label">Restaurant name</label>
                <input id="restaurant_name" className="input" required value={form.restaurant_name} onChange={set("restaurant_name")} />
              </div>
              <div>
                <label htmlFor="cuisine" className="label">Cuisine</label>
                <input id="cuisine" className="input" placeholder="Desi, chai…" value={form.cuisine} onChange={set("cuisine")} />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input id="phone" className="input" required placeholder="03xx xxxxxxx" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label htmlFor="email" className="label">Email{role === "customer" && <span className="font-normal text-chai-muted"> (your FAST email works best)</span>}</label>
            <input id="email" className="input" type="email" required value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" className="input" type="password" minLength={6} required value={form.password} onChange={set("password")} />
          </div>
          {role !== "customer" && (
            <p className="rounded-xl bg-neel-light px-3 py-2.5 text-sm text-neel">
              {role === "restaurant" ? "Your restaurant goes live" : "You can start delivering"} once the KhaoJi team approves your account. That usually takes a day.
            </p>
          )}
          {error && <p role="alert" className="rounded-xl bg-chili-light px-3 py-2 text-sm text-chili-dark">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-chai-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-chili underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
