import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { Profile, Role } from "./types";

/** Server-side guard for a role section. Redirects anyone who doesn't belong. */
export async function requireRole(role: Role): Promise<Profile> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");
  if (profile.role !== role) redirect("/");
  return profile as Profile;
}
