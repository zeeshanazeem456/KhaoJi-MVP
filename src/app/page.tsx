import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Sends each user to their own section based on role. */
export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (profile.status !== "approved") redirect("/pending");
  redirect(`/${profile.role}`);
}
