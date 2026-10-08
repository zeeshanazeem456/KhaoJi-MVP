"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bike, ShieldCheck, Store, User } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AuthCard } from "../AuthCard";

/* Demo shortcuts — remove before real launch */
const DEMO = [
  { id: "customer", label: "Student", icon: User },
  { id: "chai", label: "Restaurant", icon: Store },
  { id: "rider1", label: "Rider", icon: Bike },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message === "Invalid login credentials" ? "That email and password don't match. Check both and try again." : error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Log in" subtitle="Students, restaurants and riders all use the same app.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-xl bg-chili-light px-3 py-2 text-sm text-chili-dark">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-5 text-center text-chai-muted">
        New to KhaoJi?{" "}
        <Link href="/signup" className="font-semibold text-chili underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-[18px] bg-haldi-light p-4">
        <p className="text-sm font-semibold">Try a demo account</p>
        <p className="mb-3 text-xs text-chai-muted">Fills in the login. Password is khaoji123.</p>
        <div className="grid grid-cols-4 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.id}
              type="button"
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-xs font-semibold transition hover:ring-2 hover:ring-chai/20"
              onClick={() => {
                setEmail(`${d.id}@khaoji.test`);
                setPassword("khaoji123");
              }}
            >
              <d.icon size={18} aria-hidden />
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthCard>
  );
}
