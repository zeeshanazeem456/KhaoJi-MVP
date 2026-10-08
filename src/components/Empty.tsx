import type { LucideIcon } from "lucide-react";

export function Empty({ title, hint, icon: Icon, action }: { title: string; hint?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border-2 border-dashed border-chai-line px-6 py-9 text-center">
      {Icon && (
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-haldi-light text-chai">
          <Icon size={22} aria-hidden />
        </span>
      )}
      <p className="font-semibold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-chai-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
