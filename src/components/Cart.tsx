"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type CartLine = { menu_item_id: string; name: string; price: number; qty: number };
export type Cart = { restaurant_id: string; restaurant_name: string; lines: CartLine[] } | null;

type CartApi = {
  cart: Cart;
  add: (r: { id: string; name: string }, item: Omit<CartLine, "qty">) => void;
  setQty: (menuItemId: string, qty: number) => void;
  replace: (cart: Cart) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartApi | null>(null);
const KEY = "khaoji-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (c: Cart) => {
    setCart(c);
    try {
      if (c && c.lines.length) localStorage.setItem(KEY, JSON.stringify(c));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const api: CartApi = {
    cart,
    add(r, item) {
      // One restaurant per order: adding from another restaurant starts a new cart
      const base: NonNullable<Cart> =
        cart && cart.restaurant_id === r.id ? cart : { restaurant_id: r.id, restaurant_name: r.name, lines: [] };
      const existing = base.lines.find((l) => l.menu_item_id === item.menu_item_id);
      const lines = existing
        ? base.lines.map((l) => (l.menu_item_id === item.menu_item_id ? { ...l, qty: l.qty + 1 } : l))
        : [...base.lines, { ...item, qty: 1 }];
      save({ ...base, lines });
    },
    setQty(id, qty) {
      if (!cart) return;
      const lines = cart.lines.map((l) => (l.menu_item_id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0);
      save(lines.length ? { ...cart, lines } : null);
    },
    replace: save,
    clear: () => save(null),
    count: cart?.lines.reduce((s, l) => s + l.qty, 0) ?? 0,
    subtotal: cart?.lines.reduce((s, l) => s + l.qty * l.price, 0) ?? 0,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
