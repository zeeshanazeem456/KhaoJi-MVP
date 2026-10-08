import { TruckBand } from "@/components/TruckBand";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-chili">
      <div className="px-6 pb-8 pt-12 text-center text-white sm:pt-16">
        <h1 className="font-sign text-[64px] leading-none tracking-tight sm:text-[84px]">KhaoJi</h1>
        <p lang="ur" dir="rtl" className="mt-3 font-urdu text-2xl leading-[2.2] text-haldi">
          کھاؤ جی، جی بھر کے
        </p>
        <p className="mx-auto mt-1 max-w-xs text-[15px] text-white/90">
          Hostel-gate delivery from the dhabas and kitchens around FAST Islamabad.
        </p>
      </div>
      <TruckBand height={16} />
      <div className="flex flex-1 justify-center bg-white px-4 pb-10 pt-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mb-6 mt-1 text-chai-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
