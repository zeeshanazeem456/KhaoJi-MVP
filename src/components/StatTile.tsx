export function StatTile({ label, value, hint, tone = "plain" }: { label: string; value: string; hint?: string; tone?: "plain" | "haldi" | "neel"; accent?: boolean }) {
  const styles = {
    plain: "border border-chai-line bg-white",
    haldi: "border-2 border-chai bg-haldi shadow-sticker",
    neel: "bg-neel text-white",
  }[tone];
  const sub = tone === "neel" ? "text-white/80" : "text-chai-muted";
  return (
    <div className={`rounded-[18px] p-4 ${styles}`}>
      <p className={`text-sm font-medium ${tone === "haldi" ? "text-chai" : sub}`}>{label}</p>
      <p className="mt-1 font-sign text-[28px] leading-none">{value}</p>
      {hint && <p className={`mt-1.5 text-xs ${tone === "haldi" ? "text-chai/80" : sub}`}>{hint}</p>}
    </div>
  );
}
