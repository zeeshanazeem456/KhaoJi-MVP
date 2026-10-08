import { cuisineLook } from "@/lib/cuisine";

/** A small square "shop sign" in the restaurant's cuisine colour. */
export function RestaurantSign({ cuisine, name, size = 64 }: { cuisine: string; name: string; size?: number }) {
  const look = cuisineLook(cuisine, name);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-2xl ${look.bg} ${look.text}`}
      style={{ width: size, height: size }}
    >
      <look.icon size={size * 0.44} strokeWidth={2.1} />
    </span>
  );
}
