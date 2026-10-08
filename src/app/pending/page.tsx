import { redirect } from "next/navigation";
import { Ban, Hourglass } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { TruckBand } from "@/components/TruckBand";
import { LogoutButton } from "./LogoutButton";

export default async function PendingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,status,full_name").eq("id", user.id).single();
  if (profile?.status === "approved") redirect("/");
  const blocked = profile?.status === "blocked";
  const Icon = blocked ? Ban : Hourglass;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-chili px-4 py-3 text-center font-sign text-2xl text-white">KhaoJi</div>
      <TruckBand height={12} />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${blocked ? "bg-chili-light text-chili" : "bg-haldi text-chai"}`}>
            <Icon size={28} aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-bold">{blocked ? "This account is blocked" : "Almost there"}</h1>
          <p className="mt-2 text-chai-muted">
            {blocked
              ? "Contact the KhaoJi team to find out why and get it sorted."
              : `Thanks${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. The KhaoJi team is reviewing your ${profile?.role} account. Refresh this page once you're approved.`}
          </p>
          <div className="mt-6 flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
