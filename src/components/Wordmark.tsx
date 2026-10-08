export function Wordmark({ className = "", urdu = false }: { className?: string; urdu?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-sign tracking-tight">KhaoJi</span>
      {urdu && (
        <span lang="ur" dir="rtl" className="font-urdu text-[0.55em] leading-none opacity-90">
          کھاؤ جی
        </span>
      )}
    </span>
  );
}
